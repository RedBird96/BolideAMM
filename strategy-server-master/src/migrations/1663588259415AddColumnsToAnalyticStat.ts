import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddColumnsToAnalyticStat1663588259415
  implements MigrationInterface
{
  name = 'AddColumnsToAnalyticStat1663588259415';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "lbf_stats" ADD "staked_portfolio" jsonb DEFAULT \'{}\'',
    );
    await queryRunner.query(
      'ALTER TABLE "lbf_stats" ADD "lended_total" numeric',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "lbf_stats" DROP COLUMN "lended_total"',
    );
    await queryRunner.query(
      'ALTER TABLE "lbf_stats" DROP COLUMN "staked_portfolio"',
    );
  }
}
