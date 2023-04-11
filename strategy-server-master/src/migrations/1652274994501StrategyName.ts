import type { MigrationInterface, QueryRunner } from 'typeorm';

export class StrategyName1652274994501 implements MigrationInterface {
  name = 'StrategyName1652274994501';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "strategies" ALTER COLUMN "name" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ADD CONSTRAINT "UQ_c9ac805e6a43148f0647f543c29" UNIQUE ("name")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "strategies" DROP CONSTRAINT "UQ_c9ac805e6a43148f0647f543c29"',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ALTER COLUMN "name" DROP NOT NULL',
    );
  }
}
