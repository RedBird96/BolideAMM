import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import type { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { SLACK_MESSAGES } from 'src/common/constants/slack-messages';
import { ConfigService } from 'src/shared/services/config.service';

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  private restartUrl: string;

  constructor(
    public readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.restartUrl = this.configService.slackConfig.restartNotifyWebhookUrl;
  }

  async sendRestartNestAppMessage(data: { env: string; pid: number }) {
    return this.sendMessage({
      text: SLACK_MESSAGES.RESTART_APP(data),
    });
  }

  async sendMessage(data: {
    channel?: string;
    text: string;
    iconEmoji?: string;
  }) {
    const { channel = '#dev-backend', text, iconEmoji = ':ghost:' } = data;

    try {
      const response: AxiosResponse<any> = await firstValueFrom(
        this.httpService.post(this.restartUrl, {
          channel,
          username: 'webhookbot',
          text,
          icon_emoji: iconEmoji,
        }),
      );

      this.logger.debug({
        message: 'sendRestartMessage response',
        response: response.data,
      });
    } catch (error) {
      this.logger.error({
        message: 'sendRestartMessage',
        error,
      });
    }
  }
}
