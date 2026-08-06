import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Recurrence } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';

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
      orderBy: { createdAt: 'asc' },
    });
  }

  create(userId: string, dto: CreateIncomeDto) {
    return this.prisma.income.create({
      data: {
        name: dto.name,
        amount: dto.amount,
        recurrence: dto.recurrence ?? Recurrence.NONE,
        isPaid: dto.isPaid ?? false,
        month: dto.month,
        year: dto.year,
        userId,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateIncomeDto) {
    await this.checkOwnership(userId, id);
    return this.prisma.income.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    await this.checkOwnership(userId, id);
    return this.prisma.income.delete({ where: { id } });
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
        month,
        year,
        userId,
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
