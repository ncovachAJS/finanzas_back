import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  budget?: number;
}
