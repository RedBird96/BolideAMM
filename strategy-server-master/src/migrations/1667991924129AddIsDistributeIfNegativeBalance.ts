import { STRATEGY_TYPES } from 'src/common/constants/strategy-types';
import { StrategyEntity } from 'src/modules/strategies/strategy.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsDistributeIfNegativeBalance1667991924129
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isDistributeIfNegativeBalance = false;

    await queryRunner.manager.update(
      StrategyEntity,
      { type: STRATEGY_TYPES.LAND_BORROW_FARM },
      {
        settings: () =>
          `settings::jsonb || '{"isDistributeIfNegativeBalance": ${isDistributeIfNegativeBalance}}'`,
      },
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.update(
      StrategyEntity,
      { type: STRATEGY_TYPES.LAND_BORROW_FARM },
      { settings: () => "settings::jsonb - 'isDistributeIfNegativeBalance'" },
    );
  }
}
