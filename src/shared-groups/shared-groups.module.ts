import { Module } from '@nestjs/common';
import { SharedGroupsController } from './shared-groups.controller';
import { SharedGroupsService } from './shared-groups.service';

@Module({
  controllers: [SharedGroupsController],
  providers: [SharedGroupsService],
  exports: [SharedGroupsService],
})
export class SharedGroupsModule {}
