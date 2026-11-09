import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      include: {
        expenses: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return accounts.map((a) => ({
      ...a,
      totalAmount: a.expenses.reduce((sum, e) => sum + e.amount, 0),
      totalPaid: a.expenses
        .filter((e) => e.isPaid)
        .reduce((sum, e) => sum + e.amount, 0),
      totalPending: a.expenses
        .filter((e) => !e.isPaid)
        .reduce((sum, e) => sum + e.amount, 0),
    }));
  }

  async create(userId: string, dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: { name: dto.name, budget: dto.budget ?? null, userId },
    });
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    await this.checkOwnership(userId, id);
    return this.prisma.account.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        // null borra el presupuesto; undefined lo deja intacto
        ...(dto.budget !== undefined && { budget: dto.budget === 0 ? null : dto.budget }),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.checkOwnership(userId, id);
    return this.prisma.account.delete({ where: { id } });
  }

  /**
   * Si el usuario tiene una cuenta llamada "Ahorro", añade como ingreso (no
   * gasto) el ahorro neto (ingresos - gastos) de cada mes ya cerrado desde la
   * última vez que se procesó. La primera vez solo fija el punto de partida
   * en el último mes cerrado, sin generar nada retroactivo.
   */
  async processAutoSavings(userId: string) {
    const account = await this.prisma.account.findFirst({
      where: { userId, name: { equals: 'ahorro', mode: 'insensitive' } },
    });
    if (!account) return { created: 0 };

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();

    if (user.lastAutoSavingsMonth == null || user.lastAutoSavingsYear == null) {
      let baseMonth = curMonth - 1;
      let baseYear = curYear;
      if (baseMonth < 1) { baseMonth = 12; baseYear--; }
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastAutoSavingsMonth: baseMonth, lastAutoSavingsYear: baseYear },
      });
      return { created: 0 };
    }

    let month = user.lastAutoSavingsMonth;
    let year = user.lastAutoSavingsYear;
    let created = 0;

    while (true) {
      month++;
      if (month > 12) { month = 1; year++; }
      if (year > curYear || (year === curYear && month >= curMonth)) break; // ese mes aún no ha cerrado

      const [incomes, expenses] = await Promise.all([
        this.prisma.income.findMany({ where: { userId, month, year } }),
        this.prisma.expense.findMany({ where: { account: { userId }, month, year } }),
      ]);
      const savings =
        incomes.reduce((s, i) => s + i.amount, 0) - expenses.reduce((s, e) => s + e.amount, 0);

      if (savings > 0.004) {
        await this.prisma.income.create({
          data: {
            name: `Ahorro automático de ${MONTH_NAMES[month - 1]}`,
            amount: Math.round(savings * 100) / 100,
            isPaid: true,
            month,
            year,
            userId,
            accountId: account.id,
            notes: 'Generado automáticamente a partir del ahorro del mes',
          },
        });
        created++;
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: { lastAutoSavingsMonth: month, lastAutoSavingsYear: year },
      });
    }

    return { created };
  }

  private async checkOwnership(userId: string, id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Cuenta no encontrada');
    if (account.userId !== userId) throw new ForbiddenException();
    return account;
  }
}
