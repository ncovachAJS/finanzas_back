import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateContributionDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  /** YYYY-MM-DD. Por defecto, hoy. */
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
