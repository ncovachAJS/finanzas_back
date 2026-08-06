import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AccountsModule } from './accounts/accounts.module';
import { IncomesModule } from './incomes/incomes.module';
import { ExpensesModule } from './expenses/expenses.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CategoriesModule } from './categories/categories.module';
import { SavingsGoalsModule } from './savings-goals/savings-goals.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AccountsModule,
    IncomesModule,
    ExpensesModule,
    DashboardModule,
    CategoriesModule,
    SavingsGoalsModule,
  ],
})
export class AppModule {}
