import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

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
      data: { name: dto.name, userId },
    });
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    await this.checkOwnership(userId, id);
    return this.prisma.account.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async remove(userId: string, id: string) {
    await this.checkOwnership(userId, id);
    return this.prisma.account.delete({ where: { id } });
  }

  private async checkOwnership(userId: string, id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Cuenta no encontrada');
    if (account.userId !== userId) throw new ForbiddenException();
    return account;
  }
}
