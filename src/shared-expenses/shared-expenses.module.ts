import { Module } from '@nestjs/common';
import { SharedExpensesController } from './shared-expenses.controller';
import { SharedExpensesService } from './shared-expenses.service';
import { SharedGroupsModule } from '../shared-groups/shared-groups.module';

@Module({
  imports: [SharedGroupsModule],
  controllers: [SharedExpensesController],
  providers: [SharedExpensesService],
  exports: [SharedExpensesService],
})
export class SharedExpensesModule {}
