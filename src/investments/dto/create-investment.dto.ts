import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateInvestmentDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @IsOptional()
  emoji?: string;

  @IsString()
  @IsOptional()
  isin?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  annualLimit?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  baseContributed?: number;

  /** Valor actual al crearla; se guarda como primera valoración con fecha de hoy */
  @IsNumber()
  @Min(0)
  @IsOptional()
  initialValue?: number;
}
