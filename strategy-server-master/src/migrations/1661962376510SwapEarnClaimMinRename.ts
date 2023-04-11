import { omit } from 'lodash';
import { STRATEGY_TYPES } from 'src/common/constants/strategy-types';
import { StrategyEntity } from 'src/modules/strategies/strategy.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SwapEarnClaimMinRename1661962376510 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const strList = await queryRunner.manager.find(StrategyEntity, {
      type: STRATEGY_TYPES.LAND_BORROW_FARM,
    });

    for (const str of strList) {
      const newSettings = {
        ...omit(str.settings, ['swapEarnClaimMin']),
        claimMinUsd: 0.96,
      };

      await queryRunner.manager.update(
        StrategyEntity,
        {
          type: STRATEGY_TYPES.LAND_BORROW_FARM,
          id: str.id,
        },
        {
          settings: newSettings,
        },
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const strList = await queryRunner.manager.find(StrategyEntity, {
      type: STRATEGY_TYPES.LAND_BORROW_FARM,
    });

    for (const str of strList) {
      const newSettings = {
        ...omit(str.settings, ['claimMinUsd']),
        swapEarnClaimMin: 0.96,
      };

      await queryRunner.manager.update(
        StrategyEntity,
        {
          type: STRATEGY_TYPES.LAND_BORROW_FARM,
          id: str.id,
        },
        {
          settings: newSettings,
        },
      );
    }
  }
}
