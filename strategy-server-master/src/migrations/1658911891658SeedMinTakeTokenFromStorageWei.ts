import { STRATEGY_TYPES } from 'src/common/constants/strategy-types';
import type { LandBorrowFarmSettingsDto } from 'src/modules/land-borrow-farm-strategy/dto/LandBorrowFarmSettingsDto';
import { StrategyEntity } from 'src/modules/strategies/strategy.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMinTakeTokenFromStorageWei1658911891658
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const strList = await queryRunner.manager.find(StrategyEntity, {
      type: STRATEGY_TYPES.LAND_BORROW_FARM,
    });

    for (const str of strList) {
      const minTakeTokenFromStorageEther = 0.000_001; // 1000 GWei

      const newSettings = { ...str.settings, minTakeTokenFromStorageEther };

      await queryRunner.manager.update(
        StrategyEntity,
        { type: STRATEGY_TYPES.LAND_BORROW_FARM },
        { settings: newSettings },
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const strList = await queryRunner.manager.find(StrategyEntity, {
      type: STRATEGY_TYPES.LAND_BORROW_FARM,
    });

    for (const str of strList) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { minTakeTokenFromStorageEther, ...rest } =
        str.settings as LandBorrowFarmSettingsDto;

      await queryRunner.manager.update(
        StrategyEntity,
        { type: STRATEGY_TYPES.LAND_BORROW_FARM },
        { settings: { ...rest } },
      );
    }
  }
}
