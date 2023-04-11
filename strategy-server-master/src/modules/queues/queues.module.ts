import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { BullMqController } from './bullmq.controller';
import { BullMqService } from './bullmq.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [BullMqController],
  exports: [BullMqService],
  providers: [BullMqService],
})
export class QueuesModule {}
