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

export class CreateExpenseDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(Recurrence)
  @IsOptional()
  recurrence?: Recurrence;

  @IsBoolean()
  @IsOptional()
  isPaid?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2000)
  year: number;

  @IsUUID()
  accountId: string;
}
