import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSharedGroupDto } from './dto/create-shared-group.dto';

@Injectable()
export class SharedGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  private async requirePartnerId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.partnerId) {
      throw new BadRequestException('Primero tienes que vincular a tu pareja de gastos compartidos');
    }
    return user.partnerId;
  }

  /** Balance neto (positivo = la otra persona me debe) dentro de un grupo (o general si groupId es null). */
  private async groupBalance(userId: string, groupId: string | null) {
    const [expenses, settlements] = await Promise.all([
      this.prisma.sharedExpense.findMany({
        where: { groupId, OR: [{ paidByUserId: userId }, { owedByUserId: userId }] },
      }),
      this.prisma.settlement.findMany({
        where: { groupId, OR: [{ fromUserId: userId }, { toUserId: userId }] },
      }),
    ]);
    let balance = 0;
    for (const e of expenses) balance += e.paidByUserId === userId ? e.amount / 2 : -e.amount / 2;
    for (const s of settlements) balance += s.fromUserId === userId ? s.amount : -s.amount;
    return balance;
  }

  async findAll(userId: string) {
    const partnerId = await this.requirePartnerId(userId);
    const groups = await this.prisma.sharedGroup.findMany({
      where: {
        OR: [
          { userAId: userId, userBId: partnerId },
          { userAId: partnerId, userBId: userId },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    const generalBalance = await this.groupBalance(userId, null);
    const groupsWithBalance = await Promise.all(
      groups.map(async (g) => ({
        id: g.id,
        name: g.name,
        balance: await this.groupBalance(userId, g.id),
      })),
    );

    return {
      groups: [{ id: null, name: 'General', balance: generalBalance }, ...groupsWithBalance],
    };
  }

  async create(userId: string, dto: CreateSharedGroupDto) {
    const partnerId = await this.requirePartnerId(userId);
    const group = await this.prisma.sharedGroup.create({
      data: { name: dto.name, userAId: userId, userBId: partnerId, createdByUserId: userId },
    });
    return { id: group.id, name: group.name, balance: 0 };
  }

  async remove(userId: string, id: string) {
    const group = await this.prisma.sharedGroup.findUnique({ where: { id } });
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.userAId !== userId && group.userBId !== userId) throw new ForbiddenException();
    await this.prisma.sharedGroup.delete({ where: { id } });
    return { ok: true };
  }

  /** Verifica que el grupo (si se indica uno) pertenece a la pareja actual del usuario. */
  async checkGroupAccess(userId: string, groupId: string | null | undefined) {
    if (!groupId) return;
    const group = await this.prisma.sharedGroup.findUnique({ where: { id: groupId } });
    if (!group) throw new NotFoundException('Grupo no encontrado');
    if (group.userAId !== userId && group.userBId !== userId) throw new ForbiddenException();
  }
}
