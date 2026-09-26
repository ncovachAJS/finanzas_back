import { IsInt, Max, Min } from 'class-validator';

/** Ampliar una serie repitiéndola hasta este mes/año (incluido). */
export class RepeatDto {
  @IsInt()
  @Min(1)
  @Max(12)
  untilMonth: number;

  @IsInt()
  @Min(2000)
  untilYear: number;
}
