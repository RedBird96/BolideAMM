import { STRATEGY_TYPES } from 'src/common/constants/strategy-types';
import type { LandBorrowFarmSettingsDto } from 'src/modules/land-borrow-farm-strategy/dto/LandBorrowFarmSettingsDto';
import { StrategyEntity } from 'src/modules/strategies/strategy.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class IsTransactionProdModeDefault1663151093219
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const strList = await queryRunner.manager.find(StrategyEntity, {
      type: STRATEGY_TYPES.LAND_BORROW_FARM,
    });

    for (const str of strList) {
      const isTransactionProdMode = true;

      const newSettings = {
        ...str.settings,
        isTransactionProdMode,
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
        isTransactionProdMode,
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
