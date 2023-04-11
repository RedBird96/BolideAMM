import { Injectable } from '@nestjs/common';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';
import type { UpdateResult } from 'typeorm';

import type { TelegramSettingsEntity } from './tg-settings.entity';
import { TelegramSettingsRepository } from './tg-settings.repository';

@Injectable()
export class TelegramSettingsService {
  constructor(public readonly settingsRepository: TelegramSettingsRepository) {}

  async createDefault(): Promise<void> {
    const settings = await this.settingsRepository.findOne({});

    if (!settings) {
      await this.settingsRepository.insert({
        targetGroupId: null,
        adminTelegramId: null,
      });
    }
  }

  async getSettings(): Promise<TelegramSettingsEntity> {
    return this.settingsRepository.findOne({});
  }

  async updateSettings(data: {
    targetGroupId?: string | null;
    adminTelegramId?: string | null;
  }): Promise<UpdateResult> {
    const settings = await this.settingsRepository.findOne({});

    if (!settings) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_TELEGRAM_SETTINGS);
    }

    return this.settingsRepository.update(
      {
        id: settings.id,
      },
      data,
    );
  }
}
