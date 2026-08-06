import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { Recurrence, ExpenseType } from '@prisma/client';

export class UpdateExpenseDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsEnum(Recurrence)
  @IsOptional()
  recurrence?: Recurrence;

  @IsBoolean()
  @IsOptional()
  isPaid?: boolean;

  @IsUUID()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsEnum(ExpenseType)
  @IsOptional()
  expenseType?: ExpenseType;
}
