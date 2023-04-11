import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TelegramSettingsController } from './tg-settings.controller';
import { TelegramSettingsRepository } from './tg-settings.repository';
import { TelegramSettingsService } from './tg-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([TelegramSettingsRepository])],
  exports: [TelegramSettingsService],
  providers: [TelegramSettingsService],
  controllers: [TelegramSettingsController],
})
export class TelegramSettingsModule {}
