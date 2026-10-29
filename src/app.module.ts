import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { FriendlyThrottlerGuard } from './common/friendly-throttler.guard';
import { AuthModule } from './auth/auth.module';
import { AccountsModule } from './accounts/accounts.module';
import { IncomesModule } from './incomes/incomes.module';
import { ExpensesModule } from './expenses/expenses.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CategoriesModule } from './categories/categories.module';
import { SavingsGoalsModule } from './savings-goals/savings-goals.module';
import { InvestmentsModule } from './investments/investments.module';
import { PartnerModule } from './partner/partner.module';
import { SharedGroupsModule } from './shared-groups/shared-groups.module';
import { SharedExpensesModule } from './shared-expenses/shared-expenses.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Límite general por IP; los endpoints sensibles (login, registro…) tienen uno
    // más estricto propio con @Throttle en su controlador.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    AccountsModule,
    IncomesModule,
    ExpensesModule,
    DashboardModule,
    CategoriesModule,
    SavingsGoalsModule,
    InvestmentsModule,
    PartnerModule,
    SharedGroupsModule,
    SharedExpensesModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: FriendlyThrottlerGuard }],
})
export class AppModule {}
