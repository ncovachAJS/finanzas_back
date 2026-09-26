import { IsBoolean, IsHexColor, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateCategoryDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsHexColor()
  @IsOptional()
  color?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  budget?: number | null;

  @IsBoolean()
  @IsOptional()
  quickAdd?: boolean;
}
