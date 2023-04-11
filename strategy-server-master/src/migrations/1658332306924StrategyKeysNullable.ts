import type { MigrationInterface, QueryRunner } from 'typeorm';

export class StrategyKeysNullable1658332306924 implements MigrationInterface {
  name = 'StrategyKeysNullable1658332306924';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "strategies" DROP CONSTRAINT "FK_954bf49de058aecad0ae4d1d296"',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" DROP CONSTRAINT "FK_0e978b2865fdb4b8d61135d4a56"',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ALTER COLUMN "operations_private_key_id" DROP NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ALTER COLUMN "boosting_private_key_id" DROP NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ADD CONSTRAINT "FK_954bf49de058aecad0ae4d1d296" FOREIGN KEY ("operations_private_key_id") REFERENCES "runtime_keys"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ADD CONSTRAINT "FK_0e978b2865fdb4b8d61135d4a56" FOREIGN KEY ("boosting_private_key_id") REFERENCES "runtime_keys"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "strategies" DROP CONSTRAINT "FK_0e978b2865fdb4b8d61135d4a56"',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" DROP CONSTRAINT "FK_954bf49de058aecad0ae4d1d296"',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ALTER COLUMN "boosting_private_key_id" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ALTER COLUMN "operations_private_key_id" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ADD CONSTRAINT "FK_0e978b2865fdb4b8d61135d4a56" FOREIGN KEY ("boosting_private_key_id") REFERENCES "runtime_keys"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ADD CONSTRAINT "FK_954bf49de058aecad0ae4d1d296" FOREIGN KEY ("operations_private_key_id") REFERENCES "runtime_keys"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }
}
