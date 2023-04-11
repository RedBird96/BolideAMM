import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { AccountsService } from 'src/modules/accounts/accounts.service';

import { TG_MESSAGES } from '../../../common/constants/tg-messages';
import { TelegramSettingsService } from '../settings/tg-settings.service';
import { TelegramService } from '../telegram.service';

@Injectable()
export class AdminCommandsService {
  constructor(
    @Inject(forwardRef(() => AccountsService))
    public readonly accountsService: AccountsService,

    @Inject(forwardRef(() => TelegramService))
    public readonly telegramService: TelegramService,

    @Inject(forwardRef(() => TelegramSettingsService))
    public readonly settingsService: TelegramSettingsService,
  ) {}

  async bindTargetGroup(ctx): Promise<void> {
    const bot = this.telegramService.getBotInstance();

    const targetGroupId = String(ctx.chat.id);

    bot.context.targetGroupId = targetGroupId;

    await this.settingsService.updateSettings({
      targetGroupId,
    });

    ctx.reply(TG_MESSAGES.SUCCESS);
  }
}
