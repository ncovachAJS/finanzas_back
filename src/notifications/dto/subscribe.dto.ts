import { IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PushKeysDto {
  @IsString()
  @MinLength(1)
  p256dh: string;

  @IsString()
  @MinLength(1)
  auth: string;
}

export class SubscribeDto {
  @IsString()
  @MinLength(1)
  endpoint: string;

  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}
