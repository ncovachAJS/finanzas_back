import { IsString, MinLength } from 'class-validator';

export class CreateSharedGroupDto {
  @IsString()
  @MinLength(1)
  name: string;
}
