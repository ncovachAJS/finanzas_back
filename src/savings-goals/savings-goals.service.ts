import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSavingsGoalDto } from './dto/create-savings-goal.dto';
import { UpdateSavingsGoalDto } from './dto/update-savings-goal.dto';

@Injectable()
export class SavingsGoalsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(userId: string, dto: CreateSavingsGoalDto) {
    return this.prisma.savingsGoal.create({
      data: {
        name: dto.name,
        targetAmount: dto.targetAmount,
        savedAmount: dto.savedAmount ?? 0,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        emoji: dto.emoji ?? '🎯',
        userId,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateSavingsGoalDto) {
    await this.checkOwnership(userId, id);
    return this.prisma.savingsGoal.update({
      where: { id },
      data: {
        ...dto,
        deadline: dto.deadline !== undefined
          ? dto.deadline ? new Date(dto.deadline) : null
          : undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.checkOwnership(userId, id);
    return this.prisma.savingsGoal.delete({ where: { id } });
  }

  private async checkOwnership(userId: string, id: string) {
    const goal = await this.prisma.savingsGoal.findUnique({ where: { id } });
    if (!goal) throw new NotFoundException('Meta no encontrada');
    if (goal.userId !== userId) throw new ForbiddenException();
    return goal;
  }
}
