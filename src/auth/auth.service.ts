import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { generateRecoveryCode, generateBackupCode } from '../common/recovery-code';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegenerateRecoveryCodeDto } from './dto/regenerate-recovery-code.dto';
import { EnableTotpDto } from './dto/enable-totp.dto';
import { DisableTotpDto } from './dto/disable-totp.dto';
import { VerifyLoginDto } from './dto/verify-login.dto';

const TOTP_ISSUER = 'Cuentas Claras';
const BACKUP_CODE_COUNT = 8;

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

    if (user.totpEnabled) {
      // Token de corta duración, solo válido contra /auth/2fa/verify-login
      const tempToken = this.jwt.sign(
        { sub: user.id, email: user.email, twoFactorPending: true },
        { expiresIn: '10m' },
      );
      return { requires2fa: true, tempToken };
    }

    const token = this.sign(user.id, user.email);
    return { user: this.sanitize(user), token };
  }

  /// Segundo paso del login cuando el 2FA está activado: código TOTP o de respaldo.
  async verifyLogin(dto: VerifyLoginDto) {
    const invalid = () => new UnauthorizedException('Código incorrecto');
    let payload: { sub: string; twoFactorPending?: boolean };
    try {
      payload = await this.jwt.verifyAsync(dto.tempToken);
    } catch {
      throw new UnauthorizedException('Sesión de verificación caducada, vuelve a iniciar sesión');
    }
    if (!payload.twoFactorPending) throw invalid();

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.totpEnabled || !user.totpSecret) throw invalid();

    const code = dto.code.trim();
    let ok = authenticator.check(code, user.totpSecret);
    if (!ok) {
      const idx = await this.findBackupCodeIndex(user.totpBackupCodeHashes, code);
      if (idx !== -1) {
        ok = true;
        const hashes = [...user.totpBackupCodeHashes];
        hashes.splice(idx, 1);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { totpBackupCodeHashes: hashes },
        });
      }
    }
    if (!ok) throw invalid();

    const token = this.sign(user.id, user.email);
    return { user: this.sanitize(user), token };
  }

  /// Genera un secreto TOTP nuevo y su QR, sin activarlo todavía (eso lo hace enableTotp).
  async setupTotp(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, TOTP_ISSUER, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  /// Confirma la activación del 2FA verificando un código generado con el secreto del setup.
  async enableTotp(userId: string, dto: EnableTotpDto) {
    if (!authenticator.check(dto.code.trim(), dto.secret)) {
      throw new UnauthorizedException('Código incorrecto');
    }
    const backupCodes = Array.from({ length: BACKUP_CODE_COUNT }, () => generateBackupCode());
    const hashes = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 10)));
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: dto.secret, totpEnabled: true, totpBackupCodeHashes: hashes },
    });
    return { backupCodes };
  }

  /// Desactiva el 2FA. Requiere la contraseña actual.
  async disableTotp(userId: string, dto: DisableTotpDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('Contraseña actual incorrecta');

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: null, totpEnabled: false, totpBackupCodeHashes: [] },
    });
    return { disabled: true };
  }

  /// Genera una nueva tanda de códigos de respaldo (invalida los anteriores).
  async regenerateBackupCodes(userId: string, dto: DisableTotpDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user.totpEnabled) throw new BadRequestException('El 2FA no está activado');
    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('Contraseña actual incorrecta');

    const backupCodes = Array.from({ length: BACKUP_CODE_COUNT }, () => generateBackupCode());
    const hashes = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 10)));
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpBackupCodeHashes: hashes },
    });
    return { backupCodes };
  }

  private async findBackupCodeIndex(hashes: string[], code: string): Promise<number> {
    const normalized = code.trim().toUpperCase();
    for (let i = 0; i < hashes.length; i++) {
      if (await bcrypt.compare(normalized, hashes[i])) return i;
    }
    return -1;
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
    const { password: _p, recoveryCodeHash: _r, totpSecret: _t, totpBackupCodeHashes: _b, ...rest } = user;
    return rest;
  }
}
