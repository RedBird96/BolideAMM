import { STRATEGY_TYPES } from 'src/common/constants/strategy-types';
import { StrategyEntity } from 'src/modules/strategies/strategy.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

import { FOR_MIGRATIONS_STRATEGY_NAMES } from './data/for-migrations-strategy-names';

export class AddStrategyType1654179902498 implements MigrationInterface {
  name = 'AddStrategyType1654179902498';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TYPE \"public\".\"strategies_type_enum\" AS ENUM('LAND_BORROW_FARM', 'LAND_BORROW', 'SWAP_FARM')",
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ADD "type" "public"."strategies_type_enum"',
    );

    await queryRunner.manager.update(
      StrategyEntity,
      { name: FOR_MIGRATIONS_STRATEGY_NAMES.LRS_STRATEGY },
      {
        type: STRATEGY_TYPES.LAND_BORROW_FARM,
      },
    );

    await queryRunner.query(
      'ALTER TABLE "strategies" ALTER COLUMN "type" SET NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "strategies" DROP COLUMN "type"');
    await queryRunner.query('DROP TYPE "public"."strategies_type_enum"');
  }
}
