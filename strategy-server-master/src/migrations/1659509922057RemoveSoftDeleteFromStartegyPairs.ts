import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSoftDeleteFromStartegyPairs1659509922057
  implements MigrationInterface
{
  name = 'RemoveSoftDeleteFromStartegyPairs1659509922057';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DELETE FROM "strategy_pairs" WHERE "deleted_at" IS NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "strategy_pairs" DROP COLUMN "deleted_at"',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "strategy_pairs" ADD "deleted_at" TIMESTAMP',
    );
  }
}
