import { STRATEGY_TYPES } from 'src/common/constants/strategy-types';
import type { LandBorrowFarmSettingsDto } from 'src/modules/land-borrow-farm-strategy/dto/LandBorrowFarmSettingsDto';
import { StrategyEntity } from 'src/modules/strategies/strategy.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ClaimsSettingsFlags1661956111811 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const strList = await queryRunner.manager.find(StrategyEntity, {
      type: STRATEGY_TYPES.LAND_BORROW_FARM,
    });

    for (const str of strList) {
      const isClaimVenus = false;
      const isClaimFarms = true;
      const isClaimLended = false;
      const isVenusClaimAutostartEnabled = false;
      const venusClaimTimeoutMilliseconds = 86_400_000; // 24 hours

      const newSettings = {
        ...str.settings,
        isClaimVenus,
        isClaimFarms,
        isClaimLended,
        isVenusClaimAutostartEnabled,
        venusClaimTimeoutMilliseconds,
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
      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        isClaimVenus,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        isClaimFarms,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        isClaimLended,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        isVenusClaimAutostartEnabled,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        venusClaimTimeoutMilliseconds,
        ...rest
      } = str.settings as LandBorrowFarmSettingsDto;

      await queryRunner.manager.update(
        StrategyEntity,
        {
          type: STRATEGY_TYPES.LAND_BORROW_FARM,
          id: str.id,
        },
        {
          settings: {
            ...rest,
          },
        },
      );
    }
  }
}
