import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Investment } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvestmentDto } from './dto/create-investment.dto';
import { UpdateInvestmentDto } from './dto/update-investment.dto';
import { CreateValuationDto } from './dto/create-valuation.dto';
import { CreateContributionDto } from './dto/create-contribution.dto';

/** 'YYYY-MM-DD' → Date a medianoche UTC (columnas @db.Date). Sin fecha, hoy. */
function toDay(date?: string): Date {
  const day = (date ?? new Date().toISOString()).slice(0, 10);
  return new Date(`${day}T00:00:00.000Z`);
}

@Injectable()
export class InvestmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const investments = await this.prisma.investment.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(investments.map((inv) => this.withSummary(inv)));
  }

  async findOne(userId: string, id: string) {
    const investment = await this.checkOwnership(userId, id);
    const [summary, valuations, contributions] = await Promise.all([
      this.withSummary(investment),
      this.prisma.investmentValuation.findMany({
        where: { investmentId: id },
        orderBy: { date: 'asc' },
      }),
      this.prisma.investmentContribution.findMany({
        where: { investmentId: id },
        orderBy: { date: 'desc' },
      }),
    ]);
    return { ...summary, valuations, contributions };
  }

  async create(userId: string, dto: CreateInvestmentDto) {
    const investment = await this.prisma.investment.create({
      data: {
        name: dto.name,
        emoji: dto.emoji ?? '📈',
        isin: dto.isin || null,
        annualLimit: dto.annualLimit ?? null,
        baseContributed: dto.baseContributed ?? 0,
        userId,
        ...(dto.initialValue !== undefined && {
          valuations: { create: { value: dto.initialValue, date: toDay() } },
        }),
      },
    });
    return this.withSummary(investment);
  }

  async update(userId: string, id: string, dto: UpdateInvestmentDto) {
    await this.checkOwnership(userId, id);
    const investment = await this.prisma.investment.update({
      where: { id },
      data: dto,
    });
    return this.withSummary(investment);
  }

  async remove(userId: string, id: string) {
    await this.checkOwnership(userId, id);
    return this.prisma.investment.delete({ where: { id } });
  }

  async addValuation(userId: string, id: string, dto: CreateValuationDto) {
    await this.checkOwnership(userId, id);
    const date = toDay(dto.date);
    return this.prisma.investmentValuation.upsert({
      where: { investmentId_date: { investmentId: id, date } },
      create: { investmentId: id, date, value: dto.value },
      update: { value: dto.value },
    });
  }

  async removeValuation(userId: string, id: string, valuationId: string) {
    await this.checkOwnership(userId, id);
    const { count } = await this.prisma.investmentValuation.deleteMany({
      where: { id: valuationId, investmentId: id },
    });
    if (!count) throw new NotFoundException('Valoración no encontrada');
    return { deleted: true };
  }

  async addContribution(userId: string, id: string, dto: CreateContributionDto) {
    await this.checkOwnership(userId, id);
    return this.prisma.investmentContribution.create({
      data: {
        investmentId: id,
        amount: dto.amount,
        date: toDay(dto.date),
        notes: dto.notes || null,
      },
    });
  }

  async removeContribution(userId: string, id: string, contributionId: string) {
    await this.checkOwnership(userId, id);
    const { count } = await this.prisma.investmentContribution.deleteMany({
      where: { id: contributionId, investmentId: id },
    });
    if (!count) throw new NotFoundException('Aportación no encontrada');
    return { deleted: true };
  }

  /** Añade valor actual, total aportado, aportado este año y rentabilidad. */
  private async withSummary(investment: Investment) {
    const year = new Date().getUTCFullYear();
    const [latest, allContrib, yearContrib] = await Promise.all([
      this.prisma.investmentValuation.findMany({
        where: { investmentId: investment.id },
        orderBy: { date: 'desc' },
        take: 2,
      }),
      this.prisma.investmentContribution.aggregate({
        where: { investmentId: investment.id },
        _sum: { amount: true },
      }),
      this.prisma.investmentContribution.aggregate({
        where: {
          investmentId: investment.id,
          date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
        },
        _sum: { amount: true },
      }),
    ]);

    const currentValue = latest[0]?.value ?? null;
    const previousValue = latest[1]?.value ?? null;
    const totalContributed = investment.baseContributed + (allContrib._sum.amount ?? 0);
    const profit = currentValue !== null ? currentValue - totalContributed : null;

    return {
      ...investment,
      currentValue,
      lastValuationDate: latest[0]?.date ?? null,
      previousValue,
      totalContributed,
      contributedThisYear: yearContrib._sum.amount ?? 0,
      profit,
      profitPct: profit !== null && totalContributed > 0 ? (profit / totalContributed) * 100 : null,
    };
  }

  private async checkOwnership(userId: string, id: string) {
    const investment = await this.prisma.investment.findUnique({ where: { id } });
    if (!investment) throw new NotFoundException('Inversión no encontrada');
    if (investment.userId !== userId) throw new ForbiddenException();
    return investment;
  }
}
