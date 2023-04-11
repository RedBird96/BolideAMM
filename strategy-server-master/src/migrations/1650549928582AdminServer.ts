/* eslint-disable max-len */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminServer1650549928582 implements MigrationInterface {
  name = 'AdminServer1650549928582';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "strategies" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying, "is_active" boolean, CONSTRAINT "PK_9a0d363ddf5b40d080147363238" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "strategy_pairs" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "pair_id" integer NOT NULL, "strategy_id" integer NOT NULL, "percentage" numeric(10,8) NOT NULL, "deleted_at" TIMESTAMP, CONSTRAINT "PK_b53762c894c372ed990b34c7980" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "uid_strategy_pa_strateg_fcec56" ON "strategy_pairs" ("pair_id", "strategy_id") WHERE deleted_at IS NULL',
    );
    await queryRunner.query(
      'CREATE TABLE "pairs" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "data" jsonb DEFAULT \'{}\', CONSTRAINT "PK_bfc550b07b52c37db12aa7d8e69" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'ALTER TABLE "strategy_pairs" ADD CONSTRAINT "FK_6e647d937935e7021d229bd8731" FOREIGN KEY ("pair_id") REFERENCES "pairs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "strategy_pairs" ADD CONSTRAINT "FK_3c62bda13931aa81c14ebbb26f6" FOREIGN KEY ("strategy_id") REFERENCES "strategies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "strategy_pairs" DROP CONSTRAINT "FK_3c62bda13931aa81c14ebbb26f6"',
    );
    await queryRunner.query(
      'ALTER TABLE "strategy_pairs" DROP CONSTRAINT "FK_6e647d937935e7021d229bd8731"',
    );
    await queryRunner.query('DROP TABLE "pairs"');
    await queryRunner.query(
      'DROP INDEX "public"."uid_strategy_pa_strateg_fcec56"',
    );
    await queryRunner.query('DROP TABLE "strategy_pairs"');
    await queryRunner.query('DROP TABLE "strategies"');
  }
}
