import { IsInt, Max, Min } from 'class-validator';

/** Copia todo un mes a los 12 meses de otro año. */
export class CopyMonthDto {
  @IsInt()
  @Min(1)
  @Max(12)
  fromMonth: number;

  @IsInt()
  @Min(2000)
  fromYear: number;

  @IsInt()
  @Min(2000)
  toYear: number;
}
