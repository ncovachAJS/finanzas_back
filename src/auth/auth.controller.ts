import { Body, Controller, Get, Patch, Post, Request, UseGuards } from '@nestjs/common';
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

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

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
