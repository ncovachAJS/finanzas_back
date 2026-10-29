import { IsEmail } from 'class-validator';

export class LinkPartnerDto {
  @IsEmail()
  email: string;
}
