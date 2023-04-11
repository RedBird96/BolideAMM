/* eslint-disable max-len */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class HistoryCreateTables1664789640839 implements MigrationInterface {
  name = 'HistoryCreateTables1664789640839';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "tvl_history" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "date" TIMESTAMP NOT NULL, "blockchain_id" integer NOT NULL, "farming_tvl" numeric NOT NULL, "staking_tvl" numeric NOT NULL, "strategies_tvl_data" jsonb NOT NULL, "total_tvl" numeric NOT NULL, CONSTRAINT "PK_428c9ca88949bfea403982a4081" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "apy_history" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "date" TIMESTAMP NOT NULL, "blockchain_id" integer NOT NULL, "farming_apy" numeric, "staking_apy" numeric, "strategies_apy_data" jsonb NOT NULL, CONSTRAINT "PK_4392e41fdcb9397127fdd0038fe" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      `update strategies
       set settings = settings || '{"isSaveTvlHistoryEnabled": true, "isSaveApyHistoryEnabled": true}'::jsonb`,
    );
    await queryRunner.query(
      `update blockchains
       set settings = settings || '{"isSaveFarmingHistoryEnabled": true, "isSaveApyHistoryEnabled": true}'::jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "apy_history"');
    await queryRunner.query('DROP TABLE "tvl_history"');
  }
}
