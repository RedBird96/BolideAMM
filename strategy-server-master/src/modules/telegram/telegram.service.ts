import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { RollbarLogger } from 'nestjs-rollbar';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';
import { ConfigService } from 'src/shared/services/config.service';
import { Telegraf } from 'telegraf';

import { COMMANDS_DESCS } from '../../common/constants/tg-messages';
import { AccountsService } from '../accounts/accounts.service';
import { AdminCommandsService } from './commands/admin-commands.service';
import { GeneralCommandsService } from './commands/general-commands.service';
import { COMMANDS } from './constants/commands';
import { TelegramSettingsService } from './settings/tg-settings.service';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    @Inject(forwardRef(() => ConfigService))
    public readonly configService: ConfigService,

    @Inject(forwardRef(() => AccountsService))
    public readonly accountsService: AccountsService,

    @Inject(forwardRef(() => AdminCommandsService))
    public readonly adminCommandsService: AdminCommandsService,
    @Inject(forwardRef(() => GeneralCommandsService))
    public readonly generalCommandsService: GeneralCommandsService,

    public readonly settingsService: TelegramSettingsService,
    private readonly rollbarLogger: RollbarLogger,
  ) {
    this.botUrl = `${this.configService.telegramConfig.url}${this.configService.telegramConfig.botName}/`;
  }

  botUrl = null;

  botInstance: any;

  db = null;

  async onModuleInit(): Promise<void> {
    if (this.configService.telegramConfig.isTelegramBotEnabled) {
      this.botInstance = new Telegraf(this.configService.telegramConfig.token);

      await this.botInstance.launch();

      const { username } = await this.botInstance.telegram.getMe();

      this.botInstance.options.username = username;
      this.botInstance.context.botname = username;

      const settings = await this.settingsService.getSettings();

      const { adminTelegramId, targetGroupId } = settings;

      this.botInstance.context.owner = adminTelegramId;
      this.botInstance.context.targetGroupId = targetGroupId;

      this.botInstance.command(COMMANDS.START, async (ctx) =>
        this.generalCommandsService.start(ctx),
      );

      this.botInstance.command(COMMANDS.ADMIN_BIND_TARGET_GROUP, async (ctx) =>
        this.adminCommandsService.bindTargetGroup(ctx),
      );

      this.botInstance.telegram.setMyCommands([
        {
          command: COMMANDS.START,
          description: COMMANDS_DESCS.COMMAND_START,
        },
      ]);

      this.botInstance.catch((error, ctx) =>
        this.handleBotCatchError(error, ctx),
      );
    }
  }

  onModuleDestroy(): void {
    if (this.botInstance) {
      this.botInstance.stop();
    }
  }

  getBotInstance(): any {
    return this.botInstance;
  }

  handleBotCatchError(error, ctx) {
    this.rollbarLogger.error(error, 'telegram bot error:', { ctx });
  }

  async resetAdmin(): Promise<void> {
    const adminAccount = await this.accountsService.getAdminAccount();

    if (!adminAccount) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_ACCOUNT);
    }

    await this.accountsService.update(
      {
        id: adminAccount.id,
      },
      {
        telegramId: null,
      },
    );

    await this.settingsService.updateSettings({
      targetGroupId: null,
      adminTelegramId: null,
    });

    this.botInstance.context.owner = null;
    this.botInstance.context.targetGroupId = null;
  }

  async sendTestMessage(): Promise<void> {
    return this.sendMessageToGroup('test <b>message</b>');
  }

  async sendMessageToGroup(messageHtml: string) {
    if (!this.configService.telegramConfig.isTelegramBotEnabled) {
      return this.logger.warn({ message: 'telegram message', messageHtml });
    }

    const settings = await this.settingsService.getSettings();

    const { targetGroupId } = settings;

    if (!targetGroupId) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_TG_TARGET_GROUP_ID);
    }

    return this.botInstance.telegram.sendMessage(targetGroupId, messageHtml, {
      parse_mode: 'HTML',
    });
  }
}
