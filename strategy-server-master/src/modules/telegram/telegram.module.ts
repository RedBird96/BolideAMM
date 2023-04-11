import { forwardRef, Module } from '@nestjs/common';

import { AccountsModule } from '../accounts/accounts.module';
import { AdminCommandsService } from './commands/admin-commands.service';
import { GeneralCommandsService } from './commands/general-commands.service';
import { TelegramSettingsModule } from './settings/tg-settings.module';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';

@Module({
  imports: [forwardRef(() => AccountsModule), TelegramSettingsModule],
  controllers: [TelegramController],
  providers: [TelegramService, AdminCommandsService, GeneralCommandsService],
  exports: [TelegramService],
})
export class TelegramModule {}
