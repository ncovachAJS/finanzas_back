import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { generateRecoveryCode } from '../common/recovery-code';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegenerateRecoveryCodeDto } from './dto/regenerate-recovery-code.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exists) throw new ConflictException('Email ya registrado');

    const hashed = await bcrypt.hash(dto.password, 10);
    const recoveryCode = generateRecoveryCode();
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashed,
        recoveryCodeHash: await bcrypt.hash(recoveryCode, 10),
      },
    });

    const token = this.sign(user.id, user.email);
    // El código en claro solo se devuelve aquí; no se guarda en ningún sitio
    return { user: this.sanitize(user), token, recoveryCode };
  }

  /// Cambia la contraseña con el código de recuperación (sin sesión). Rota el código.
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const invalid = () => new UnauthorizedException('Email o código de recuperación incorrectos');
    if (!user || !user.recoveryCodeHash) throw invalid();

    const valid = await bcrypt.compare(dto.recoveryCode, user.recoveryCodeHash);
    if (!valid) throw invalid();

    const recoveryCode = generateRecoveryCode();
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(dto.newPassword, 10),
        recoveryCodeHash: await bcrypt.hash(recoveryCode, 10),
      },
    });

    const token = this.sign(updated.id, updated.email);
    return { user: this.sanitize(updated), token, recoveryCode };
  }

  /// Genera un código de recuperación nuevo (invalida el anterior). Requiere sesión + contraseña.
  async regenerateRecoveryCode(userId: string, dto: RegenerateRecoveryCodeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('Contraseña actual incorrecta');

    const recoveryCode = generateRecoveryCode();
    await this.prisma.user.update({
      where: { id: userId },
      data: { recoveryCodeHash: await bcrypt.hash(recoveryCode, 10) },
    });
    return { recoveryCode };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Credenciales incorrectas');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Credenciales incorrectas');

    const token = this.sign(user.id, user.email);
    return { user: this.sanitize(user), token };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return this.sanitize(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const data: { name?: string; password?: string; monthlyBudget?: number | null; avatar?: string | null } = {};

    if (dto.name) data.name = dto.name;
    if (dto.monthlyBudget !== undefined) {
      data.monthlyBudget = dto.monthlyBudget === 0 ? null : dto.monthlyBudget;
    }
    if (dto.avatar !== undefined) data.avatar = dto.avatar || null;

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Se requiere la contraseña actual');
      }
      const valid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!valid) throw new UnauthorizedException('Contraseña actual incorrecta');
      data.password = await bcrypt.hash(dto.newPassword, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.sanitize(updated);
  }

  private sign(userId: string, email: string) {
    return this.jwt.sign({ sub: userId, email });
  }

  private sanitize(user: any) {
    const { password: _p, recoveryCodeHash: _r, ...rest } = user;
    return rest;
  }
}
