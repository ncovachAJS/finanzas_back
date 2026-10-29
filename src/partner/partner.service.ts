import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LinkPartnerDto } from './dto/link-partner.dto';

const PARTNER_SELECT = { id: true, name: true, email: true, avatar: true };

@Injectable()
export class PartnerService {
  constructor(private readonly prisma: PrismaService) {}

  async getPartner(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.partnerId) return { linked: false, partner: null };
    const partner = await this.prisma.user.findUnique({
      where: { id: user.partnerId },
      select: PARTNER_SELECT,
    });
    if (!partner) return { linked: false, partner: null };
    return { linked: true, partner };
  }

  async link(userId: string, dto: LinkPartnerDto) {
    const me = await this.prisma.user.findUnique({ where: { id: userId } });
    if (me?.partnerId) {
      throw new BadRequestException(
        'Ya tienes una pareja de gastos compartidos. Desvincúlala antes de vincular otra.',
      );
    }
    const target = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (!target) throw new NotFoundException('No existe ninguna cuenta con ese email');
    if (target.id === userId) {
      throw new BadRequestException('No puedes vincularte a ti mismo');
    }
    if (target.partnerId) {
      throw new BadRequestException('Esa persona ya tiene una pareja vinculada');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { partnerId: target.id } }),
      this.prisma.user.update({ where: { id: target.id }, data: { partnerId: userId } }),
    ]);
    return this.getPartner(userId);
  }

  async unlink(userId: string) {
    const me = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!me?.partnerId) return { linked: false, partner: null };
    const partnerId = me.partnerId;
    await this.prisma.user.update({ where: { id: userId }, data: { partnerId: null } });
    try {
      await this.prisma.user.update({ where: { id: partnerId }, data: { partnerId: null } });
    } catch (e) {
      // La otra cuenta pudo haberse eliminado: no bloquea la desvinculación por mi lado.
    }
    return { linked: false, partner: null };
  }
}
