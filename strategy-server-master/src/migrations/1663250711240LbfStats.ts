import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LbfStats1663250711240 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE IF EXISTS "strategy_stats" RENAME TO "lbf_stats"',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE IF EXISTS "lbf_stats" RENAME TO "strategy_stats"',
    );
  }
}
