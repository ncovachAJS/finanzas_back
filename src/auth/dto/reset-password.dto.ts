import { IsEmail, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  recoveryCode: string;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
