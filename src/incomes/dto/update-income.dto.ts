import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Recurrence } from '@prisma/client';

export class UpdateIncomeDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @IsOptional()
  month?: number;

  @IsInt()
  @Min(2000)
  @IsOptional()
  year?: number;

  @IsEnum(Recurrence)
  @IsOptional()
  recurrence?: Recurrence;

  @IsBoolean()
  @IsOptional()
  isPaid?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  accountId?: string;

  /** Aplicar también los cambios a las repeticiones de los meses siguientes */
  @IsBoolean()
  @IsOptional()
  applyToFollowing?: boolean;
}
