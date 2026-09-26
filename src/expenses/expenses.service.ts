import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Expense, Recurrence, ExpenseType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { RepeatDto } from '../common/repeat.dto';
import {
  RECURRENCE_STEP,
  afterMonth,
  monthIndex,
  nextOccurrences,
} from '../common/series';

const INCLUDE = {
  account: { select: { id: true, name: true } },
  category: { select: { id: true, name: true, icon: true, color: true } },
};

/** Campos que se copian a las repeticiones al editar "este y los siguientes". */
const SHARED_FIELDS = [
  'name',
  'amount',
  'recurrence',
  'notes',
  'accountId',
  'categoryId',
  'expenseType',
  'totalCuotas',
] as const;

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, month?: number, year?: number) {
    // Solo devuelve gastos de cuentas propias del usuario
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: { id: true },
    });
    const accountIds = accounts.map((a) => a.id);

    return this.prisma.expense.findMany({
      where: {
        accountId: { in: accountIds },
        ...(month !== undefined && { month }),
        ...(year !== undefined && { year }),
      },
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, dto: CreateExpenseDto) {
    await this.checkAccountOwnership(userId, dto.accountId);
    const recurrence = dto.recurrence ?? Recurrence.NONE;
    const repeat =
      recurrence !== Recurrence.NONE && !!dto.repeatUntilMonth && !!dto.repeatUntilYear;
    const created = await this.prisma.expense.create({
      data: {
        name: dto.name,
        amount: dto.amount,
        recurrence,
        isPaid: dto.isPaid ?? false,
        notes: dto.notes ?? null,
        month: dto.month,
        year: dto.year,
        accountId: dto.accountId,
        categoryId: dto.categoryId ?? null,
        expenseType: dto.expenseType ?? ExpenseType.VARIABLE,
        cuotaNumber: dto.cuotaNumber ?? null,
        totalCuotas: dto.totalCuotas ?? null,
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

  async update(userId: string, id: string, dto: UpdateExpenseDto) {
    const expense = await this.checkOwnership(userId, id);
    const { applyToFollowing, ...data } = dto;
    if (data.accountId && data.accountId !== expense.accountId) {
      await this.checkAccountOwnership(userId, data.accountId);
    }
    const updated = await this.prisma.expense.update({
      where: { id },
      data,
      include: INCLUDE,
    });
    if (!applyToFollowing) return updated;

    const following = await this.findFollowing(userId, expense);
    const shared: Record<string, unknown> = {};
    for (const key of SHARED_FIELDS) {
      if (data[key] !== undefined) shared[key] = data[key];
    }
    const step = RECURRENCE_STEP[updated.recurrence] || 1;
    const base = monthIndex(updated.month, updated.year);
    const ops = following.map((f) => {
      // Las cuotas se renumeran a partir de la editada: +1 por cada paso de recurrencia
      const cuota =
        updated.cuotaNumber != null
          ? updated.cuotaNumber + Math.round((monthIndex(f.month, f.year) - base) / step)
          : f.cuotaNumber;
      if (cuota != null && updated.totalCuotas != null && cuota > updated.totalCuotas) {
        return this.prisma.expense.delete({ where: { id: f.id } });
      }
      return this.prisma.expense.update({
        where: { id: f.id },
        data: { ...shared, cuotaNumber: cuota },
      });
    });
    await this.prisma.$transaction(ops);
    return { ...updated, updatedFollowing: following.length };
  }

  /** scope 'following' borra también las repeticiones de los meses siguientes. */
  async remove(userId: string, id: string, scope?: string) {
    const expense = await this.checkOwnership(userId, id);
    if (scope !== 'following') {
      return this.prisma.expense.delete({ where: { id } });
    }
    const following = await this.findFollowing(userId, expense);
    const { count } = await this.prisma.expense.deleteMany({
      where: { id: { in: [id, ...following.map((f) => f.id)] } },
    });
    return { deleted: count };
  }

  /** Amplía la serie de este gasto hasta el mes indicado, a partir de su última repetición. */
  async repeat(userId: string, id: string, dto: RepeatDto) {
    const expense = await this.checkOwnership(userId, id);
    if (expense.recurrence === Recurrence.NONE) {
      throw new BadRequestException('El gasto no tiene recurrencia');
    }
    const following = await this.findFollowing(userId, expense);
    const seriesId = expense.seriesId ?? randomUUID();
    if (!expense.seriesId) {
      // Gasto antiguo (sin serie): se enlaza con sus copias posteriores
      await this.prisma.expense.updateMany({
        where: { id: { in: [id, ...following.map((f) => f.id)] } },
        data: { seriesId },
      });
    }
    const last = following[following.length - 1] ?? expense;
    const created = await this.createRepetitions(
      { ...last, recurrence: expense.recurrence, seriesId },
      dto.untilMonth,
      dto.untilYear,
    );
    return { created };
  }

  /** Crea las repeticiones posteriores a `base` hasta el mes indicado. Devuelve cuántas. */
  private async createRepetitions(base: Expense, untilMonth: number, untilYear: number) {
    const rows = [];
    for (const { month, year, k } of nextOccurrences(
      base.month,
      base.year,
      base.recurrence,
      untilMonth,
      untilYear,
    )) {
      const cuota = base.cuotaNumber != null ? base.cuotaNumber + k : null;
      if (cuota != null && base.totalCuotas != null && cuota > base.totalCuotas) break;
      rows.push({
        name: base.name,
        amount: base.amount,
        recurrence: base.recurrence,
        isPaid: false,
        notes: base.notes,
        month,
        year,
        accountId: base.accountId,
        categoryId: base.categoryId,
        expenseType: base.expenseType,
        cuotaNumber: cuota,
        totalCuotas: base.totalCuotas,
        seriesId: base.seriesId,
      });
    }
    if (rows.length) await this.prisma.expense.createMany({ data: rows });
    return rows.length;
  }

  /**
   * Repeticiones de los meses siguientes, ordenadas por fecha. Si el gasto es de una
   * serie, las de la serie; si es antiguo (sin serie), las que tienen el mismo nombre.
   */
  private async findFollowing(userId: string, expense: Expense) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: { id: true },
    });
    return this.prisma.expense.findMany({
      where: {
        id: { not: expense.id },
        accountId: { in: accounts.map((a) => a.id) },
        ...(expense.seriesId
          ? { seriesId: expense.seriesId }
          : { name: { equals: expense.name, mode: 'insensitive' as const } }),
        ...afterMonth(expense.month, expense.year),
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });
  }


  private async checkOwnership(userId: string, id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: { account: true },
    });
    if (!expense) throw new NotFoundException('Gasto no encontrado');
    if (expense.account.userId !== userId) throw new ForbiddenException();
    return expense;
  }

  private async checkAccountOwnership(userId: string, accountId: string) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });
    if (!account) throw new NotFoundException('Cuenta no encontrada');
    if (account.userId !== userId) throw new ForbiddenException();
  }
}
