import { Body, Controller, Get, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegenerateRecoveryCodeDto } from './dto/regenerate-recovery-code.dto';
import { JwtGuard } from './guards/jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Endpoints que verifican una contraseña o un código: límite propio y estricto
  // por IP para dificultar probar contraseñas o códigos por fuerza bruta.
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @UseGuards(JwtGuard)
  @Post('recovery-code/regenerate')
  regenerateRecoveryCode(@Request() req, @Body() dto: RegenerateRecoveryCodeDto) {
    return this.authService.regenerateRecoveryCode(req.user.id, dto);
  }

  @UseGuards(JwtGuard)
  @Get('me')
  me(@Request() req) {
    return this.authService.me(req.user.id);
  }

  @UseGuards(JwtGuard)
  @Patch('profile')
  updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, dto);
  }
}
