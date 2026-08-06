import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /// Stats anuales: por mes, totales, dona por cuenta y por categoría.
  async getYearStats(userId: string, year: number) {
    const [incomes, expenses, accounts, categories, user] = await Promise.all([
      this.prisma.income.findMany({ where: { userId, year } }),
      this.prisma.expense.findMany({
        where: { account: { userId }, year },
        include: {
          account: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, icon: true, color: true } },
        },
      }),
      this.prisma.account.findMany({
        where: { userId },
        select: { id: true, name: true },
      }),
      this.prisma.category.findMany({
        where: { userId },
        select: { id: true, name: true, icon: true, color: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { monthlyBudget: true },
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
        savings: paidIncomes - paidExpenses,
      };
    });

    const accumulatedSavings = months.reduce((s, m) => s + m.savings, 0);
    const yearTotalIncomes = incomes.reduce((s, i) => s + i.amount, 0);
    const yearTotalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    // Solo lo realmente cobrado/pagado (coincide con accumulatedSavings)
    const yearPaidIncomes = incomes.filter((i) => i.isPaid).reduce((s, i) => s + i.amount, 0);
    const yearPaidExpenses = expenses.filter((e) => e.isPaid).reduce((s, e) => s + e.amount, 0);

    // Dona por cuenta
    const accountBreakdown = accounts.map((a) => {
      const total = expenses
        .filter((e) => e.account.id === a.id)
        .reduce((s, e) => s + e.amount, 0);
      return { accountId: a.id, accountName: a.name, total };
    });

    // Dona por categoría (solo si hay gastos con categoría asignada)
    const categoryBreakdown = categories.map((c) => {
      const total = expenses
        .filter((e) => e.categoryId === c.id)
        .reduce((s, e) => s + e.amount, 0);
      return { categoryId: c.id, categoryName: c.name, icon: c.icon, color: c.color, total };
    }).filter((c) => c.total > 0);

    const uncategorizedTotal = expenses
      .filter((e) => !e.categoryId)
      .reduce((s, e) => s + e.amount, 0);
    if (uncategorizedTotal > 0) {
      categoryBreakdown.push({
        categoryId: null,
        categoryName: 'Sin categoría',
        icon: '📦',
        color: '#6B7280',
        total: uncategorizedTotal,
      });
    }

    // Dona por tipo de gasto
    const expenseTypeMeta: Record<string, { label: string; icon: string; color: string }> = {
      FIXED:      { label: 'Gasto fijo',     icon: '🏠', color: '#6366F1' },
      VARIABLE:   { label: 'Gasto variable',  icon: '🛒', color: '#22C55E' },
      DEBT:       { label: 'Deuda',           icon: '💳', color: '#EF4444' },
      DONATION:   { label: 'Donación',        icon: '🎁', color: '#EC4899' },
      INVESTMENT: { label: 'Inversión',       icon: '📈', color: '#3B82F6' },
      SAVINGS:    { label: 'Ahorro',          icon: '🏦', color: '#10B981' },
      OTHER:      { label: 'Otro',            icon: '📦', color: '#6B7280' },
    };
    const expenseTypeBreakdown = Object.entries(expenseTypeMeta).map(([type, meta]) => {
      const total = expenses
        .filter((e) => e.expenseType === type)
        .reduce((s, e) => s + e.amount, 0);
      return { expenseType: type, label: meta.label, icon: meta.icon, color: meta.color, total };
    }).filter((t) => t.total > 0);

    return {
      year,
      months,
      accumulatedSavings,
      yearTotalIncomes,
      yearTotalExpenses,
      yearPaidIncomes,
      yearPaidExpenses,
      accountBreakdown,
      categoryBreakdown,
      expenseTypeBreakdown,
      monthlyBudget: user?.monthlyBudget ?? null,
    };
  }

  /// Stats del mes: detalle cobrado/pendiente, breakdown por categoría, alerta presupuesto.
  async getMonthStats(userId: string, month: number, year: number) {
    const [incomes, expenses, user] = await Promise.all([
      this.prisma.income.findMany({ where: { userId, month, year } }),
      this.prisma.expense.findMany({
        where: { account: { userId }, month, year },
        include: {
          account: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, icon: true, color: true } },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { monthlyBudget: true },
      }),
    ]);

    const totalIncomes = incomes.reduce((s, i) => s + i.amount, 0);
    const paidIncomes = incomes.filter((i) => i.isPaid).reduce((s, i) => s + i.amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const paidExpenses = expenses.filter((e) => e.isPaid).reduce((s, e) => s + e.amount, 0);

    // Budget alert
    const monthlyBudget = user?.monthlyBudget ?? null;
    const budgetUsedFraction = monthlyBudget ? totalExpenses / monthlyBudget : null;
    const budgetAlert = monthlyBudget && totalExpenses >= monthlyBudget * 0.85;

    return {
      month,
      year,
      totalIncomes,
      paidIncomes,
      pendingIncomes: totalIncomes - paidIncomes,
      totalExpenses,
      paidExpenses,
      pendingExpenses: totalExpenses - paidExpenses,
      available: paidIncomes - paidExpenses,
      monthlyBudget,
      budgetUsedFraction,
      budgetAlert,
    };
  }

  /// Historial unificado: todos los movimientos del usuario, con filtros opcionales.
  async getHistory(
    userId: string,
    month?: number,
    year?: number,
    limit = 50,
    offset = 0,
  ) {
    const [incomes, expenses] = await Promise.all([
      this.prisma.income.findMany({
        where: {
          userId,
          ...(month !== undefined && { month }),
          ...(year !== undefined && { year }),
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.expense.findMany({
        where: {
          account: { userId },
          ...(month !== undefined && { month }),
          ...(year !== undefined && { year }),
        },
        include: {
          account: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, icon: true, color: true } },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    // Mezcla y ordena por fecha de creación desc
    const items = [
      ...incomes.map((i) => ({
        id: i.id,
        type: 'income' as const,
        name: i.name,
        amount: i.amount,
        isPaid: i.isPaid,
        recurrence: i.recurrence,
        notes: i.notes,
        month: i.month,
        year: i.year,
        createdAt: i.createdAt,
        accountName: null,
        categoryName: null,
        categoryIcon: null,
        categoryColor: null,
      })),
      ...expenses.map((e) => ({
        id: e.id,
        type: 'expense' as const,
        name: e.name,
        amount: e.amount,
        isPaid: e.isPaid,
        recurrence: e.recurrence,
        notes: e.notes,
        month: e.month,
        year: e.year,
        createdAt: e.createdAt,
        accountName: e.account.name,
        categoryName: e.category?.name ?? null,
        categoryIcon: e.category?.icon ?? null,
        categoryColor: e.category?.color ?? null,
      })),
    ].sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      if (b.month !== a.month) return b.month - a.month;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const total = items.length;
    const paginated = items.slice(offset, offset + limit);

    return { total, items: paginated };
  }
}
