/* eslint-disable max-len */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMigrationsTable1653033931836 implements MigrationInterface {
  name = 'AddMigrationsTable1653033931836';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "monitoring_pairs" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "pair_id" integer NOT NULL, "token1_price" numeric NOT NULL, "token2_price" numeric NOT NULL, "ratio" numeric NOT NULL, CONSTRAINT "PK_46f503e3bac40ff0232610f0ac2" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "monitoring_tokens" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "market" character varying NOT NULL, "token" character varying NOT NULL, "price" numeric NOT NULL, "dex_price" numeric, CONSTRAINT "PK_17b10c48aa67ae7f499ede2d405" PRIMARY KEY ("id"))',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "monitoring_tokens"');
    await queryRunner.query('DROP TABLE "monitoring_pairs"');
  }
}
