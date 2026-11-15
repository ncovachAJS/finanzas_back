import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribeDto } from './dto/subscribe.dto';

interface PushPayload {
  title: string;
  body: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private vapidConfigured = false;

  constructor(private readonly prisma: PrismaService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.vapidConfigured = true;
    } else {
      this.logger.warn(
        'VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY no configuradas: las notificaciones push están desactivadas.',
      );
    }
  }

  getVapidPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY ?? null };
  }

  async subscribe(userId: string, dto: SubscribeDto) {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: { endpoint: dto.endpoint, p256dh: dto.keys.p256dh, auth: dto.keys.auth, userId },
      update: { p256dh: dto.keys.p256dh, auth: dto.keys.auth, userId },
    });
    return { ok: true };
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
    return { ok: true };
  }

  async sendTestNotification(userId: string) {
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    if (!subs.length) return { sent: 0 };
    const sent = await this.sendToSubscriptions(subs, {
      title: 'Cuentas Claras',
      body: 'Las notificaciones están activadas correctamente 🎉',
    });
    return { sent };
  }

  /** Se ejecuta una vez al día. Para cada usuario con notificaciones activadas,
   *  avisa de gastos pendientes de meses anteriores (ya vencidos) y, en los
   *  últimos 5 días del mes en curso, también de los pendientes de este mes.
   *  Si sigue pendiente al día siguiente, vuelve a avisar (recordatorio). */
  @Cron('0 9 * * *', { timeZone: 'Europe/Madrid' })
  async checkDuePayments() {
    if (!this.vapidConfigured) return { checked: 0, notified: 0 };
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    const daysInMonth = new Date(curYear, curMonth, 0).getDate();
    const dueSoon = now.getDate() >= daysInMonth - 4;

    const subscribedUsers = await this.prisma.pushSubscription.findMany({
      select: { userId: true },
      distinct: ['userId'],
    });

    let notified = 0;
    for (const { userId } of subscribedUsers) {
      const accounts = await this.prisma.account.findMany({ where: { userId }, select: { id: true } });
      const accountIds = accounts.map((a) => a.id);
      if (!accountIds.length) continue;

      const pending = await this.prisma.expense.findMany({
        where: {
          accountId: { in: accountIds },
          isPaid: false,
          OR: [
            { year: { lt: curYear } },
            { year: curYear, month: { lt: curMonth } },
            ...(dueSoon ? [{ year: curYear, month: curMonth }] : []),
          ],
        },
        select: { name: true, amount: true },
      });
      if (!pending.length) continue;

      const total = pending.reduce((s, e) => s + e.amount, 0);
      const names = pending.slice(0, 3).map((e) => e.name).join(', ');
      const extra = pending.length > 3 ? ` y ${pending.length - 3} más` : '';
      const plural = pending.length > 1;

      const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
      const sent = await this.sendToSubscriptions(subs, {
        title: `Tienes ${pending.length} gasto${plural ? 's' : ''} pendiente${plural ? 's' : ''}`,
        body: `${names}${extra} · ${total.toFixed(2)} €`,
      });
      if (sent) notified++;
    }
    return { checked: subscribedUsers.length, notified };
  }

  private async sendToSubscriptions(
    subs: { id: string; endpoint: string; p256dh: string; auth: string }[],
    payload: PushPayload,
  ) {
    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
        sent++;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Suscripción caducada o revocada por el navegador: se borra para no reintentar en vano.
          await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          this.logger.warn(`Error enviando push a ${sub.endpoint}: ${err.message}`);
        }
      }
    }
    return sent;
  }
}
