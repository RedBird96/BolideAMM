import { AccountEntity } from 'src/modules/accounts/account.entity';
import { TelegramSettingsEntity } from 'src/modules/telegram/settings/tg-settings.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

import { admin } from './data/seeds/admin';

export class SeedInit1649396297132 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const account = await queryRunner.manager.findOne(AccountEntity, {});

    if (!account) {
      await queryRunner.manager.save(AccountEntity, admin);
    }

    const settings = await queryRunner.manager.findOne(
      TelegramSettingsEntity,
      {},
    );

    if (!settings) {
      const telegramSettings = {
        targetGroupId: null,
        adminTelegramId: null,
      };

      await queryRunner.manager.save(TelegramSettingsEntity, telegramSettings);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_queryRunner: QueryRunner): Promise<void> {
    void null;
  }
}
