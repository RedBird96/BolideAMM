/* eslint-disable max-len */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LendingStatCreate1651844128524 implements MigrationInterface {
  name = 'LendingStatCreate1651844128524';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TYPE "public"."lending-stat_platform_enum" AS ENUM(\'venus\')',
    );
    await queryRunner.query(
      'CREATE TABLE "lending-stat" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "platform" "public"."lending-stat_platform_enum" NOT NULL, "total_borrows" numeric, "total_borrows_usd" numeric, "total_supply" numeric, "total_supply_usd" numeric, "collateral_factor" numeric, "borrow_apy" numeric, "supply_apy" numeric, "borrow_venus_apy" numeric, "supply_venus_apy" numeric, "liquidity" numeric, "token_price" numeric, "borrower_count" integer, "supplier_count" integer, "platform_address" character varying, "platform_symbol" character varying, "address" character varying, "token" character varying, CONSTRAINT "PK_2773cd02793f69b725110c838a0" PRIMARY KEY ("id"))',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "lending-stat"');
    await queryRunner.query('DROP TYPE "public"."lending-stat_platform_enum"');
  }
}
