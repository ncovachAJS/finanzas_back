import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SharedGroupsService } from '../shared-groups/shared-groups.service';
import { CreateSharedExpenseDto } from './dto/create-shared-expense.dto';
import { UpdateSharedExpenseDto } from './dto/update-shared-expense.dto';
import { SettleDto } from './dto/settle.dto';

@Injectable()
export class SharedExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groups: SharedGroupsService,
  ) {}

  private async requirePartnerId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.partnerId) {
      throw new BadRequestException('Primero tienes que vincular a tu pareja de gastos compartidos');
    }
    return user.partnerId;
  }

  /**
   * groupIdParam === undefined -> combinado (todos los grupos + general, cada item con su groupName)
   * groupIdParam === 'general' -> solo el cubo general
   * groupIdParam === '<id>'    -> solo ese grupo
   */
  async findAll(userId: string, groupIdParam?: string) {
    const partnerId = await this.requirePartnerId(userId);
    const combined = groupIdParam === undefined;
    const groupId = combined ? undefined : groupIdParam === 'general' ? null : groupIdParam;
    if (!combined) await this.groups.checkGroupAccess(userId, groupId);
    const groupFilter = combined ? {} : { groupId };

    const [partner, expenses, settlements] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: partnerId },
        select: { id: true, name: true, email: true, avatar: true },
      }),
      this.prisma.sharedExpense.findMany({
        where: { ...groupFilter, OR: [{ paidByUserId: userId }, { owedByUserId: userId }] },
        include: combined ? { group: true } : undefined,
        orderBy: { date: 'desc' },
      }),
      this.prisma.settlement.findMany({
        where: { ...groupFilter, OR: [{ fromUserId: userId }, { toUserId: userId }] },
        include: combined ? { group: true } : undefined,
        orderBy: { date: 'desc' },
      }),
    ]);

    let balance = 0;
    for (const e of expenses) {
      balance += e.paidByUserId === userId ? e.amount / 2 : -e.amount / 2;
    }
    for (const s of settlements) {
      balance += s.fromUserId === userId ? s.amount : -s.amount;
    }

    const items = [
      ...expenses.map((e: any) => ({
        type: 'expense' as const,
        id: e.id,
        description: e.description,
        amount: e.amount,
        notes: e.notes,
        date: e.date,
        createdAt: e.createdAt,
        iPaid: e.paidByUserId === userId,
        groupId: e.groupId,
        groupName: combined ? (e.group?.name ?? 'General') : undefined,
      })),
      ...settlements.map((s: any) => ({
        type: 'settlement' as const,
        id: s.id,
        amount: s.amount,
        note: s.note,
        date: s.date,
        createdAt: s.createdAt,
        iPaid: s.fromUserId === userId,
        groupId: s.groupId,
        groupName: combined ? (s.group?.name ?? 'General') : undefined,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime() || b.createdAt.getTime() - a.createdAt.getTime());

    return { partner, balance, items };
  }

  async create(userId: string, dto: CreateSharedExpenseDto) {
    const partnerId = await this.requirePartnerId(userId);
    const groupId = dto.groupId ?? null;
    await this.groups.checkGroupAccess(userId, groupId);
    return this.prisma.sharedExpense.create({
      data: {
        description: dto.description,
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : new Date(),
        notes: dto.notes,
        groupId,
        paidByUserId: dto.paidByMe ? userId : partnerId,
        owedByUserId: dto.paidByMe ? partnerId : userId,
        createdByUserId: userId,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateSharedExpenseDto) {
    const partnerId = await this.requirePartnerId(userId);
    await this.checkExpenseAccess(userId, id);
    const data: Record<string, unknown> = {};
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.date !== undefined) data.date = new Date(dto.date);
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.paidByMe !== undefined) {
      data.paidByUserId = dto.paidByMe ? userId : partnerId;
      data.owedByUserId = dto.paidByMe ? partnerId : userId;
    }
    return this.prisma.sharedExpense.update({ where: { id }, data });
  }

  async remove(userId: string, id: string) {
    await this.checkExpenseAccess(userId, id);
    return this.prisma.sharedExpense.delete({ where: { id } });
  }

  async settle(userId: string, dto: SettleDto) {
    const partnerId = await this.requirePartnerId(userId);
    const groupId = dto.groupId ?? null;
    await this.groups.checkGroupAccess(userId, groupId);
    return this.prisma.settlement.create({
      data: {
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : new Date(),
        note: dto.note,
        groupId,
        fromUserId: dto.iPaid ? userId : partnerId,
        toUserId: dto.iPaid ? partnerId : userId,
        createdByUserId: userId,
      },
    });
  }

  async removeSettlement(userId: string, id: string) {
    const settlement = await this.prisma.settlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('Pago no encontrado');
    if (settlement.fromUserId !== userId && settlement.toUserId !== userId) {
      throw new ForbiddenException();
    }
    return this.prisma.settlement.delete({ where: { id } });
  }

  private async checkExpenseAccess(userId: string, id: string) {
    const expense = await this.prisma.sharedExpense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Gasto compartido no encontrado');
    if (expense.paidByUserId !== userId && expense.owedByUserId !== userId) {
      throw new ForbiddenException();
    }
    return expense;
  }
}
