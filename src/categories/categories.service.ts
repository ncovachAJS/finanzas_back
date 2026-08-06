import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

// Categorías por defecto que se crean la primera vez
const DEFAULT_CATEGORIES = [
  { name: 'Alimentación',   icon: '🛒', color: '#22C55E' },
  { name: 'Transporte',     icon: '🚗', color: '#3B82F6' },
  { name: 'Hogar',          icon: '🏠', color: '#F59E0B' },
  { name: 'Salud',          icon: '💊', color: '#EF4444' },
  { name: 'Ocio',           icon: '🎬', color: '#8B5CF6' },
  { name: 'Ropa',           icon: '👗', color: '#EC4899' },
  { name: 'Educación',      icon: '📚', color: '#06B6D4' },
  { name: 'Restaurantes',   icon: '🍽️', color: '#F97316' },
  { name: 'Suscripciones',  icon: '📱', color: '#6366F1' },
  { name: 'Otros',          icon: '📦', color: '#6B7280' },
];

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const categories = await this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });

    // Auto-seed si el usuario no tiene categorías
    if (categories.length === 0) {
      return this.seedDefaults(userId);
    }
    return categories;
  }

  async create(userId: string, dto: CreateCategoryDto) {
    const exists = await this.prisma.category.findUnique({
      where: { name_userId: { name: dto.name, userId } },
    });
    if (exists) throw new ConflictException('Ya existe una categoría con ese nombre');

    return this.prisma.category.create({
      data: {
        name: dto.name,
        icon: dto.icon ?? '📦',
        color: dto.color ?? '#6366F1',
        userId,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    await this.checkOwnership(userId, id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.checkOwnership(userId, id);
    return this.prisma.category.delete({ where: { id } });
  }

  private async seedDefaults(userId: string) {
    await this.prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })),
      skipDuplicates: true,
    });
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  private async checkOwnership(userId: string, id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    if (cat.userId !== userId) throw new ForbiddenException();
    return cat;
  }
}
