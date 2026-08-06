import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /// Stats anuales: por mes, totales y dona por cuenta.
  async getYearStats(userId: string, year: number) {
    const [incomes, expenses, accounts] = await Promise.all([
      this.prisma.income.findMany({ where: { userId, year } }),
      this.prisma.expense.findMany({
        where: {
          account: { userId },
          year,
        },
        include: { account: { select: { id: true, name: true } } },
      }),
      this.prisma.account.findMany({
        where: { userId },
        select: { id: true, name: true },
      }),
    ]);

    // Por mes (1-12)
    const months = Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
      const monthIncomes = incomes.filter((i) => i.month === m);
      const monthExpenses = expenses.filter((e) => e.month === m);

      const totalIncomes = monthIncomes.reduce((s, i) => s + i.amount, 0);
      const paidIncomes = monthIncomes
        .filter((i) => i.isPaid)
        .reduce((s, i) => s + i.amount, 0);
      const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);
      const paidExpenses = monthExpenses
        .filter((e) => e.isPaid)
        .reduce((s, e) => s + e.amount, 0);

      return {
        month: m,
        totalIncomes,
        paidIncomes,
        pendingIncomes: totalIncomes - paidIncomes,
        totalExpenses,
        paidExpenses,
        pendingExpenses: totalExpenses - paidExpenses,
        // Ahorro del mes = cobrado - pagado
        savings: paidIncomes - paidExpenses,
      };
    });

    // Ahorro acumulado año
    const accumulatedSavings = months.reduce((s, m) => s + m.savings, 0);

    // Totales año
    const yearTotalIncomes = incomes.reduce((s, i) => s + i.amount, 0);
    const yearTotalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    // Dona: peso de cada cuenta en el total de gastos del año
    const accountBreakdown = accounts.map((a) => {
      const total = expenses
        .filter((e) => e.account.id === a.id)
        .reduce((s, e) => s + e.amount, 0);
      return { accountId: a.id, accountName: a.name, total };
    });

    return {
      year,
      months,
      accumulatedSavings,
      yearTotalIncomes,
      yearTotalExpenses,
      accountBreakdown,
    };
  }

  /// Stats del mes actual: detalle cobrado/pendiente, pagado/pendiente.
  async getMonthStats(userId: string, month: number, year: number) {
    const [incomes, expenses] = await Promise.all([
      this.prisma.income.findMany({ where: { userId, month, year } }),
      this.prisma.expense.findMany({
        where: { account: { userId }, month, year },
        include: { account: { select: { id: true, name: true } } },
      }),
    ]);

    const totalIncomes = incomes.reduce((s, i) => s + i.amount, 0);
    const paidIncomes = incomes
      .filter((i) => i.isPaid)
      .reduce((s, i) => s + i.amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const paidExpenses = expenses
      .filter((e) => e.isPaid)
      .reduce((s, e) => s + e.amount, 0);

    return {
      month,
      year,
      totalIncomes,
      paidIncomes,
      pendingIncomes: totalIncomes - paidIncomes,
      totalExpenses,
      paidExpenses,
      pendingExpenses: totalExpenses - paidExpenses,
      // Lo que queda = cobrado - pagado
      available: paidIncomes - paidExpenses,
    };
  }
}
