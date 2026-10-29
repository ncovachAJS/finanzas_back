import { IsString, Length, MinLength } from 'class-validator';

export class EnableTotpDto {
  /** El secreto devuelto por /auth/2fa/setup, para no guardar nada hasta confirmarlo. */
  @IsString()
  @MinLength(1)
  secret: string;

  @IsString()
  @Length(6, 6)
  code: string;
}
