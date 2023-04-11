import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { AccountsService } from 'src/modules/accounts/accounts.service';

import { TG_MESSAGES } from '../../../common/constants/tg-messages';
import { TelegramSettingsService } from '../settings/tg-settings.service';
import { TelegramService } from '../telegram.service';

@Injectable()
export class GeneralCommandsService {
  constructor(
    @Inject(forwardRef(() => AccountsService))
    public readonly accountsService: AccountsService,

    @Inject(forwardRef(() => TelegramService))
    public readonly telegramService: TelegramService,

    public readonly settingsService: TelegramSettingsService,
  ) {}

  async start(ctx) {
    if (ctx.chat.type === 'private') {
      const bot = this.telegramService.getBotInstance();

      if (bot.context.owner === null) {
        ctx.reply(TG_MESSAGES.HELLO_OWNER);

        await this.accountsService.setTelegramBotOwner(ctx.from.id);
        await this.settingsService.updateSettings({
          adminTelegramId: String(ctx.from.id),
        });

        bot.context.owner = String(ctx.from.id);
      }

      ctx.reply(TG_MESSAGES.START, { parse_mode: 'HTML' });
    }
  }

  async help(ctx): Promise<void> {
    if (ctx.chat.type === 'private') {
      const bot = this.telegramService.getBotInstance();

      ctx.reply(
        [
          String(ctx.from.id) === bot.context.owner
            ? TG_MESSAGES.COMMAND_ADMIN_BIND_TARGET_GROUP
            : [],
        ].join('\n'),
      );
    }
  }
}
