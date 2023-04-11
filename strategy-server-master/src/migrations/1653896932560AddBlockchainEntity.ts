/* eslint-disable max-len */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBlockchainEntity1653896932560 implements MigrationInterface {
  name = 'AddBlockchainEntity1653896932560';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "blockchains" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "settings" jsonb NOT NULL, CONSTRAINT "UQ_dc4814fee557a9169944ca9dc06" UNIQUE ("name"), CONSTRAINT "PK_388138041975d49f3d0446cf634" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ALTER COLUMN "settings" SET NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "strategies" ALTER COLUMN "settings" DROP NOT NULL',
    );
    await queryRunner.query('DROP TABLE "blockchains"');
  }
}
