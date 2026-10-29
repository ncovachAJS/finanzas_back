import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SettleDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  /** true = el pago lo hice yo a la otra persona; false = me lo hizo la otra persona a mí */
  @IsBoolean()
  iPaid: boolean;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  note?: string;

  /** null/ausente = cubo "General" */
  @IsString()
  @IsOptional()
  groupId?: string;
}
