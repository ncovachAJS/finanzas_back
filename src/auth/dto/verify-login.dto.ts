import { IsString, MinLength } from 'class-validator';

export class VerifyLoginDto {
  @IsString()
  @MinLength(1)
  tempToken: string;

  /** Código de 6 dígitos de la app autenticadora, o un código de respaldo XXXX-XXXX. */
  @IsString()
  @MinLength(1)
  code: string;
}
