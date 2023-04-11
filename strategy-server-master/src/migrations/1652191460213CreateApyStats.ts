/* eslint-disable max-len */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApyStats1652191460213 implements MigrationInterface {
  name = 'CreateApyStats1652191460213';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TYPE "public"."apy-stat_platform_enum" AS ENUM(\'venus\')',
    );
    await queryRunner.query(
      'CREATE TABLE "apy-stat" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "platform" "public"."apy-stat_platform_enum" NOT NULL, "pair" character varying NOT NULL, "farm" character varying NOT NULL, "total_apy" numeric, "borrow_tokens_apy" numeric, "supplied_tokens_apy" numeric, "farm_apy" numeric, CONSTRAINT "PK_5f21b1c416bf9257e7f674aa0b2" PRIMARY KEY ("id"))',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "apy-stat"');
    await queryRunner.query('DROP TYPE "public"."apy-stat_platform_enum"');
  }
}
