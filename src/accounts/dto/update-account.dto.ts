import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateAccountDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  budget?: number;
}
