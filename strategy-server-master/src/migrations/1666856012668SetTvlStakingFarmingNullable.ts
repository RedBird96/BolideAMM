import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SetTvlStakingFarmingNullable1666856012668
  implements MigrationInterface
{
  name = 'SetTvlStakingFarmingNullable1666856012668';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "tvl_history" ALTER COLUMN "farming_tvl" DROP NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "tvl_history" ALTER COLUMN "staking_tvl" DROP NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "tvl_history" ALTER COLUMN "staking_tvl" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "tvl_history" ALTER COLUMN "farming_tvl" SET NOT NULL',
    );
  }
}
