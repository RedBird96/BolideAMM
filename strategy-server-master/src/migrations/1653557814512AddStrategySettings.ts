import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStrategySettings1653557814512 implements MigrationInterface {
  name = 'AddStrategySettings1653557814512';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "strategies" ADD "settings" jsonb');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "strategies" DROP COLUMN "settings"');
  }
}
