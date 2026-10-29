import { Body, Controller, Delete, Get, Post, Request, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { PartnerService } from './partner.service';
import { LinkPartnerDto } from './dto/link-partner.dto';

@Controller('partner')
@UseGuards(JwtGuard)
export class PartnerController {
  constructor(private readonly service: PartnerService) {}

  @Get()
  get(@Request() req) {
    return this.service.getPartner(req.user.id);
  }

  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post('link')
  link(@Request() req, @Body() dto: LinkPartnerDto) {
    return this.service.link(req.user.id, dto);
  }

  @Delete()
  unlink(@Request() req) {
    return this.service.unlink(req.user.id);
  }
}
