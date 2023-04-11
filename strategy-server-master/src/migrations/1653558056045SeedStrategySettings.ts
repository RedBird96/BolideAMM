import { StrategyEntity } from 'src/modules/strategies/strategy.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

import { FOR_MIGRATIONS_STRATEGY_NAMES } from './data/for-migrations-strategy-names';
import { settings as defaultLrsSettings } from './data/seeds/lrs-settigs';

export class SeedStrategySettings1653558056045 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.update(
      StrategyEntity,
      { name: FOR_MIGRATIONS_STRATEGY_NAMES.LRS_STRATEGY },
      {
        settings: defaultLrsSettings,
      },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(queryRunner: QueryRunner): Promise<void> {
    void null;
  }
}
