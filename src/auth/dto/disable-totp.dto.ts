import { IsString, MinLength } from 'class-validator';

export class DisableTotpDto {
  @IsString()
  @MinLength(1)
  currentPassword: string;
}
