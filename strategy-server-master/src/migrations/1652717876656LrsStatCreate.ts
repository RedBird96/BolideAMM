import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LrsStatCreate1652717876656 implements MigrationInterface {
  name = 'LrsStatCreate1652717876656';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      // eslint-disable-next-line max-len
      'CREATE TABLE "lrs-stat" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "amount" numeric, "venus_earn_amount" numeric, "farming_amount" numeric, "lended_amount" numeric, "borrow_vs_staked_amount" numeric, "borrowed_amount" numeric, "staked_amount" numeric, "venus_percent_limit" numeric, "wallet_amount" numeric, "wallet_info" jsonb DEFAULT \'{}\', "farming_earns" jsonb DEFAULT \'{}\', "lended_tokens" jsonb DEFAULT \'{}\', "borrowed" jsonb DEFAULT \'{}\', "staked" jsonb DEFAULT \'{}\', "borrow_vs_staked" jsonb DEFAULT \'{}\', CONSTRAINT "PK_a9d28fe6c59f74bb81b925e4abb" PRIMARY KEY ("id"))',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "lrs-stat"');
  }
}
