/* eslint-disable max-len */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStrategyToLrsStats1659530703218 implements MigrationInterface {
  name = 'AddStrategyToLrsStats1659530703218';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "strategy_stats" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "strategy_id" integer NOT NULL, "amount" numeric, "venus_earn_amount" numeric, "farming_amount" numeric, "lended_amount" numeric, "borrow_vs_staked_amount" numeric, "borrowed_amount" numeric, "staked_amount" numeric, "venus_percent_limit" numeric, "wallet_amount" numeric, "wallet_info" jsonb DEFAULT \'{}\', "farming_earns" jsonb DEFAULT \'{}\', "lended_tokens" jsonb DEFAULT \'{}\', "borrowed" jsonb DEFAULT \'{}\', "staked" jsonb DEFAULT \'{}\', "borrow_vs_staked" jsonb DEFAULT \'{}\', CONSTRAINT "PK_0cb4354dc1030c68c0929e87d30" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'ALTER TABLE "strategy_stats" ADD CONSTRAINT "FK_17514d2f30a7cdf6af9faae6a6f" FOREIGN KEY ("strategy_id") REFERENCES "strategies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );

    await queryRunner.query(
      'CREATE UNIQUE INDEX "uid_strategy_pa_strateg_fcec56" ON "strategy_pairs" ("pair_id", "strategy_id")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "public"."uid_strategy_pa_strateg_fcec56"',
    );

    await queryRunner.query(
      'ALTER TABLE "strategy_stats" DROP CONSTRAINT "FK_17514d2f30a7cdf6af9faae6a6f"',
    );
    await queryRunner.query('DROP TABLE "strategy_stats"');
  }
}
