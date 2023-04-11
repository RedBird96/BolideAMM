import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStrategyToApyStats1659014984214 implements MigrationInterface {
  name = 'AddStrategyToApyStats1659014984214';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "apy_stats" ADD "strategy_id" integer',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "apy_stats" DROP COLUMN "strategy_id"',
    );
  }
}
