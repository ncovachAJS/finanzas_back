import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { NotificationsService } from './notifications.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { UnsubscribeDto } from './dto/unsubscribe.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('vapid-public-key')
  getPublicKey() {
    return this.notificationsService.getVapidPublicKey();
  }

  @UseGuards(JwtGuard)
  @Post('subscribe')
  subscribe(@Request() req, @Body() dto: SubscribeDto) {
    return this.notificationsService.subscribe(req.user.id, dto);
  }

  @UseGuards(JwtGuard)
  @Delete('subscribe')
  unsubscribe(@Request() req, @Body() dto: UnsubscribeDto) {
    return this.notificationsService.unsubscribe(req.user.id, dto.endpoint);
  }

  @UseGuards(JwtGuard)
  @Post('test')
  test(@Request() req) {
    return this.notificationsService.sendTestNotification(req.user.id);
  }

  /** Disparo manual de la comprobación diaria, para pruebas o como respaldo
   *  desde un cron externo. Protegido por un secreto compartido (no por JWT
   *  de usuario), porque recorre a todos los usuarios, no solo al que llama. */
  @Post('run-check')
  runCheck(@Headers('x-cron-secret') secret: string) {
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      throw new UnauthorizedException();
    }
    return this.notificationsService.checkDuePayments();
  }
}
