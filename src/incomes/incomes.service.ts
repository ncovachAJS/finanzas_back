import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Income, Recurrence } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { RepeatDto } from '../common/repeat.dto';
import { afterMonth, nextOccurrences } from '../common/series';

const INCLUDE = { account: { select: { id: true, name: true } } };

/** Campos que se copian a las repeticiones al editar "este y los siguientes". */
const SHARED_FIELDS = ['name', 'amount', 'recurrence', 'notes', 'accountId'] as const;

@Injectable()
export class IncomesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string, month?: number, year?: number) {
    return this.prisma.income.findMany({
      where: {
        userId,
        ...(month !== undefined && { month }),
        ...(year !== undefined && { year }),
      },
      include: { account: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, dto: CreateIncomeDto) {
    if (dto.accountId) await this.checkAccountOwnership(userId, dto.accountId);
    const recurrence = dto.recurrence ?? Recurrence.NONE;
    const repeat =
      recurrence !== Recurrence.NONE && !!dto.repeatUntilMonth && !!dto.repeatUntilYear;
    const created = await this.prisma.income.create({
      data: {
        name: dto.name,
        amount: dto.amount,
        recurrence,
        isPaid: dto.isPaid ?? false,
        notes: dto.notes ?? null,
        month: dto.month,
        year: dto.year,
        userId,
        accountId: dto.accountId ?? null,
        seriesId: repeat ? randomUUID() : null,
      },
      include: INCLUDE,
    });
    if (!repeat) return created;
    const repeated = await this.createRepetitions(
      created,
      dto.repeatUntilMonth!,
      dto.repeatUntilYear!,
    );
    return { ...created, repeated };
  }

  async update(userId: string, id: string, dto: UpdateIncomeDto) {
    const income = await this.checkOwnership(userId, id);
    const { applyToFollowing, ...data } = dto;
    if (data.accountId && data.accountId !== income.accountId) {
      await this.checkAccountOwnership(userId, data.accountId);
    }
    const updated = await this.prisma.income.update({
      where: { id },
      data,
      include: INCLUDE,
    });
    if (!applyToFollowing) return updated;

    const following = await this.findFollowing(userId, income);
    const shared: Record<string, unknown> = {};
    for (const key of SHARED_FIELDS) {
      if (data[key] !== undefined) shared[key] = data[key];
    }
    if (following.length && Object.keys(shared).length) {
      await this.prisma.income.updateMany({
        where: { id: { in: following.map((f) => f.id) } },
        data: shared,
      });
    }
    return { ...updated, updatedFollowing: following.length };
  }

  /** scope 'following' borra también las repeticiones de los meses siguientes. */
  async remove(userId: string, id: string, scope?: string) {
    const income = await this.checkOwnership(userId, id);
    if (scope !== 'following') {
      return this.prisma.income.delete({ where: { id } });
    }
    const following = await this.findFollowing(userId, income);
    const { count } = await this.prisma.income.deleteMany({
      where: { id: { in: [id, ...following.map((f) => f.id)] } },
    });
    return { deleted: count };
  }

  /** Amplía la serie de este ingreso hasta el mes indicado, a partir de su última repetición. */
  async repeat(userId: string, id: string, dto: RepeatDto) {
    const income = await this.checkOwnership(userId, id);
    if (income.recurrence === Recurrence.NONE) {
      throw new BadRequestException('El ingreso no tiene recurrencia');
    }
    const following = await this.findFollowing(userId, income);
    const seriesId = income.seriesId ?? randomUUID();
    if (!income.seriesId) {
      // Ingreso antiguo (sin serie): se enlaza con sus copias posteriores
      await this.prisma.income.updateMany({
        where: { id: { in: [id, ...following.map((f) => f.id)] } },
        data: { seriesId },
      });
    }
    const last = following[following.length - 1] ?? income;
    const created = await this.createRepetitions(
      { ...last, recurrence: income.recurrence, seriesId },
      dto.untilMonth,
      dto.untilYear,
    );
    return { created };
  }

  /** Crea las repeticiones posteriores a `base` hasta el mes indicado. Devuelve cuántas. */
  private async createRepetitions(base: Income, untilMonth: number, untilYear: number) {
    const rows = nextOccurrences(
      base.month,
      base.year,
      base.recurrence,
      untilMonth,
      untilYear,
    ).map(({ month, year }) => ({
      name: base.name,
      amount: base.amount,
      recurrence: base.recurrence,
      isPaid: false,
      notes: base.notes,
      month,
      year,
      userId: base.userId,
      accountId: base.accountId,
      seriesId: base.seriesId,
    }));
    if (rows.length) await this.prisma.income.createMany({ data: rows });
    return rows.length;
  }

  /**
   * Repeticiones de los meses siguientes, ordenadas por fecha. Si el ingreso es de una
   * serie, las de la serie; si es antiguo (sin serie), las que tienen el mismo nombre.
   */
  private findFollowing(userId: string, income: Income) {
    return this.prisma.income.findMany({
      where: {
        id: { not: income.id },
        userId,
        ...(income.seriesId
          ? { seriesId: income.seriesId }
          : { name: { equals: income.name, mode: 'insensitive' as const } }),
        ...afterMonth(income.month, income.year),
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });
  }

  private async checkAccountOwnership(userId: string, accountId: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) throw new NotFoundException('Cuenta no encontrada');
    if (account.userId !== userId) throw new ForbiddenException();
  }

  /// Propaga los ingresos recurrentes del mes anterior al mes indicado.
  /// Solo crea registros que aún no existan (basado en nombre + mes + año).
  async propagate(userId: string, month: number, year: number) {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const recurring = await this.prisma.income.findMany({
      where: {
        userId,
        month: prevMonth,
        year: prevYear,
        recurrence: { not: Recurrence.NONE },
      },
    });

    const existing = await this.prisma.income.findMany({
      where: { userId, month, year },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((i) => i.name));

    const toCreate = recurring.filter((r) => !existingNames.has(r.name));

    if (toCreate.length === 0) return { created: 0 };

    await this.prisma.income.createMany({
      data: toCreate.map((r) => ({
        name: r.name,
        amount: r.amount,
        recurrence: r.recurrence,
        isPaid: false,
        notes: r.notes ?? null,
        month,
        year,
        userId,
        accountId: r.accountId ?? null,
      })),
    });

    return { created: toCreate.length };
  }

  private async checkOwnership(userId: string, id: string) {
    const income = await this.prisma.income.findUnique({ where: { id } });
    if (!income) throw new NotFoundException('Ingreso no encontrado');
    if (income.userId !== userId) throw new ForbiddenException();
    return income;
  }
}
