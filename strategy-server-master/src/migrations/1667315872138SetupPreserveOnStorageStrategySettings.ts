import { StrategyEntity } from 'src/modules/strategies/strategy.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SetupPreserveOnStorageStrategySettings1667315872138
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const limitsToPreserveOnStorage = [
      {
        maxAmountUsd: 10_000,
        percentToPreserve: 0.1,
      },
      {
        maxAmountUsd: 300_000,
        percentToPreserve: 0.015,
      },
    ];

    const maxAmountUsdToPreserveOnStorage = 5000;

    await queryRunner.manager.update(
      StrategyEntity,
      {},
      {
        settings: () =>
          `settings::jsonb || '{"limitsToPreserveOnStorage": ${JSON.stringify(
            limitsToPreserveOnStorage,
          )}, "maxAmountUsdToPreserveOnStorage": ${maxAmountUsdToPreserveOnStorage}}'`,
      },
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.update(
      StrategyEntity,
      {},
      {
        settings: () =>
          "settings::jsonb - '{limitsToPreserveOnStorage, maxAmountUsdToPreserveOnStorage}'::text[]",
      },
    );
  }
}
