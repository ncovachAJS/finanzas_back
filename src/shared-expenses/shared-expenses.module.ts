import { Module } from '@nestjs/common';
import { SharedExpensesController } from './shared-expenses.controller';
import { SharedExpensesService } from './shared-expenses.service';

@Module({
  controllers: [SharedExpensesController],
  providers: [SharedExpensesService],
  exports: [SharedExpensesService],
})
export class SharedExpensesModule {}
