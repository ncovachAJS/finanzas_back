import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSavingsGoalDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsNumber()
  @Min(1)
  targetAmount: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  savedAmount?: number;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsString()
  @IsOptional()
  emoji?: string;
}
