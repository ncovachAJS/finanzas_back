import { IsString, MinLength } from 'class-validator';

export class RegenerateRecoveryCodeDto {
  @IsString()
  @MinLength(1)
  currentPassword: string;
}
