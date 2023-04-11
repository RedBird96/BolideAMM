import { PLATFORMS } from 'src/common/constants/platforms';
import { ApyStatEntity } from 'src/modules/bnb/analytics/apy-stat.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RefApyStats1658993385264 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "apy_stats" ADD "farm_platform" "public"."platform_enum"',
    );

    await queryRunner.query(
      'ALTER TABLE "apy_stats" RENAME COLUMN "platform" TO "lending_platform"',
    );

    const apyStatList = await queryRunner.query('SELECT * from apy_stats');

    for (const apyStat of apyStatList) {
      if (
        apyStat.farm === PLATFORMS.APESWAP ||
        apyStat.farm.toLowerCase() === 'apeswap'
      ) {
        await queryRunner.query(
          `UPDATE apy_stats SET farm_platform = 'APESWAP' where id = ${apyStat.id};`,
        );
        continue;
      }

      if (
        apyStat.farm === PLATFORMS.PANCAKESWAP ||
        apyStat.farm.toLowerCase() === 'pancake'
      ) {
        await queryRunner.query(
          `UPDATE apy_stats SET farm_platform = 'PANCAKESWAP' where id = ${apyStat.id};`,
        );
        continue;
      }

      if (
        apyStat.farm === PLATFORMS.BISWAP ||
        apyStat.farm.toLowerCase() === 'biswap'
      ) {
        await queryRunner.query(
          `UPDATE apy_stats SET farm_platform = 'BISWAP' where id = ${apyStat.id};`,
        );
        continue;
      }

      await queryRunner.manager.delete(ApyStatEntity, { id: apyStat.id });
    }

    await queryRunner.query(
      'ALTER TABLE "apy_stats" ALTER COLUMN "farm_platform" SET NOT NULL',
    );

    await queryRunner.query('ALTER TABLE "apy_stats" DROP COLUMN "farm"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "apy_stats" RENAME COLUMN "lending_platform" TO "platform"',
    );

    await queryRunner.query(
      'ALTER TABLE "apy_stats" ADD "farm" character varying',
    );

    const apyStatList = await queryRunner.query('SELECT * from apy_stats');

    for (const apyStat of apyStatList) {
      if (apyStat.farm_platform === PLATFORMS.APESWAP) {
        await queryRunner.query(
          `UPDATE apy_stats SET farm = 'APESWAP' where id = ${apyStat.id};`,
        );
        continue;
      }

      if (apyStat.farm_platform === PLATFORMS.PANCAKESWAP) {
        await queryRunner.query(
          `UPDATE apy_stats SET farm = 'PANCAKESWAP' where id = ${apyStat.id};`,
        );
        continue;
      }

      if (apyStat.farm_platform === PLATFORMS.BISWAP) {
        await queryRunner.query(
          `UPDATE apy_stats SET farm = 'BISWAP' where id = ${apyStat.id};`,
        );
        continue;
      }

      await queryRunner.manager.delete(ApyStatEntity, { id: apyStat.id });
    }

    await queryRunner.query(
      'ALTER TABLE "apy_stats" DROP COLUMN "farm_platform"',
    );
  }
}
