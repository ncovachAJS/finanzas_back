import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  currentPassword?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  newPassword?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  monthlyBudget?: number;
}
