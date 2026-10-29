import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateSharedExpenseDto {
  @IsString()
  @MinLength(1)
  description: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  /** true = lo pagué yo (la otra persona me debe la mitad); false = lo pagó la otra persona */
  @IsBoolean()
  paidByMe: boolean;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  /** null/ausente = cubo "General" */
  @IsString()
  @IsOptional()
  groupId?: string;
}
