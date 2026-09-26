import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateInvestmentDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  emoji?: string;

  @IsString()
  @IsOptional()
  isin?: string | null;

  @IsNumber()
  @Min(0)
  @IsOptional()
  annualLimit?: number | null;

  @IsNumber()
  @Min(0)
  @IsOptional()
  baseContributed?: number;
}
