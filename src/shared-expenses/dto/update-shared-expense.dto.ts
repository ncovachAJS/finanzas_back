import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateSharedExpenseDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;

  @IsBoolean()
  @IsOptional()
  paidByMe?: boolean;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
