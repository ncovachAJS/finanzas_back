import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateValuationDto {
  @IsNumber()
  @Min(0)
  value: number;

  /** YYYY-MM-DD. Por defecto, hoy. Si ya hay valoración ese día, se sobrescribe. */
  @IsDateString()
  @IsOptional()
  date?: string;
}
