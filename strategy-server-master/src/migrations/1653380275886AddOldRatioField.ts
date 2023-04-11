import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOldRatioField1653380275886 implements MigrationInterface {
  name = 'AddOldRatioField1653380275886';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('TRUNCATE TABLE "monitoring_pairs"');
    await queryRunner.query(
      'ALTER TABLE "monitoring_pairs" ADD "old_ratio" numeric NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "monitoring_pairs" DROP COLUMN "old_ratio"',
    );
  }
}
