import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Recurrence, ExpenseType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

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
    return this.prisma.expense.create({
      data: {
        name: dto.name,
        amount: dto.amount,
        recurrence: dto.recurrence ?? Recurrence.NONE,
        isPaid: dto.isPaid ?? false,
        notes: dto.notes ?? null,
        month: dto.month,
        year: dto.year,
        accountId: dto.accountId,
        categoryId: dto.categoryId ?? null,
        expenseType: dto.expenseType ?? ExpenseType.VARIABLE,
      },
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateExpenseDto) {
    const expense = await this.checkOwnership(userId, id);
    if (dto.accountId && dto.accountId !== expense.accountId) {
      await this.checkAccountOwnership(userId, dto.accountId);
    }
    return this.prisma.expense.update({
      where: { id },
      data: dto,
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.checkOwnership(userId, id);
    return this.prisma.expense.delete({ where: { id } });
  }

  /// Propaga los gastos recurrentes del mes anterior al mes indicado.
  async propagate(userId: string, month: number, year: number) {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const accounts = await this.prisma.account.findMany({
      where: { userId },
      select: { id: true },
    });
    const accountIds = accounts.map((a) => a.id);

    const recurring = await this.prisma.expense.findMany({
      where: {
        accountId: { in: accountIds },
        month: prevMonth,
        year: prevYear,
        recurrence: { not: Recurrence.NONE },
      },
    });

    const existing = await this.prisma.expense.findMany({
      where: { accountId: { in: accountIds }, month, year },
      select: { name: true, accountId: true },
    });
    const existingKeys = new Set(existing.map((e) => `${e.accountId}|${e.name}`));

    const toCreate = recurring.filter(
      (r) => !existingKeys.has(`${r.accountId}|${r.name}`),
    );

    if (toCreate.length === 0) return { created: 0 };

    await this.prisma.expense.createMany({
      data: toCreate.map((r) => ({
        name: r.name,
        amount: r.amount,
        recurrence: r.recurrence,
        isPaid: false,
        notes: r.notes ?? null,
        month,
        year,
        accountId: r.accountId,
        categoryId: r.categoryId ?? null,
        expenseType: r.expenseType ?? ExpenseType.VARIABLE,
      })),
    });

    return { created: toCreate.length };
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
