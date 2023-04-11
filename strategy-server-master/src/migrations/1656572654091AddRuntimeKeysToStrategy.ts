import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRuntimeKeysToStrategy1656572654091
  implements MigrationInterface
{
  name = 'AddRuntimeKeysToStrategy1656572654091';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "strategies" ADD "operations_private_key_id" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ADD CONSTRAINT "UQ_954bf49de058aecad0ae4d1d296" UNIQUE ("operations_private_key_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ADD "boosting_private_key_id" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ADD CONSTRAINT "FK_954bf49de058aecad0ae4d1d296" FOREIGN KEY ("operations_private_key_id") REFERENCES "runtime_keys"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ADD CONSTRAINT "FK_0e978b2865fdb4b8d61135d4a56" FOREIGN KEY ("boosting_private_key_id") REFERENCES "runtime_keys"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );

    const strategies = await queryRunner.manager.query(
      'SELECT id FROM "strategies" ORDER BY id',
    );

    for (const strategy of strategies) {
      const operationsPrivateKeyName = `OPERATIONS_PRIVATE_KEY_${strategy.id}`;
      const boostingPrivateKeyName = `BOOSTING_PRIVATE_KEY_${strategy.id}`;

      const operationsPrivateKey = await queryRunner.manager.query(
        `SELECT id FROM "runtime_keys" WHERE name = '${operationsPrivateKeyName}' ORDER BY id`,
      );

      if (operationsPrivateKey.length === 0) {
        await queryRunner.manager.query(
          `INSERT INTO "runtime_keys" (name) VALUES ('${operationsPrivateKeyName}')`,
        );
      }

      const boostingPrivateKey = await queryRunner.manager.query(
        `SELECT id FROM "runtime_keys" WHERE name = '${boostingPrivateKeyName}' ORDER BY id`,
      );

      if (boostingPrivateKey.length === 0) {
        await queryRunner.manager.query(
          `INSERT INTO "runtime_keys" (name) VALUES ('${boostingPrivateKeyName}')`,
        );
      }

      const privateKeys = await queryRunner.manager.query(
        `SELECT id FROM "runtime_keys" WHERE name in ('${operationsPrivateKeyName}', '${boostingPrivateKeyName}') ORDER BY id`,
      );
      await queryRunner.query(
        `UPDATE "strategies" SET "operations_private_key_id" = ${privateKeys[0].id}, "boosting_private_key_id" = ${privateKeys[1].id} WHERE id = ${strategy.id}`,
      );
    }

    await queryRunner.query(
      'ALTER TABLE "strategies" ALTER COLUMN "operations_private_key_id" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ALTER COLUMN "boosting_private_key_id" SET NOT NULL',
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
      'ALTER TABLE "strategies" DROP CONSTRAINT "UQ_0e978b2865fdb4b8d61135d4a56"',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" DROP COLUMN "boosting_private_key_id"',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" DROP CONSTRAINT "UQ_954bf49de058aecad0ae4d1d296"',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" DROP COLUMN "operations_private_key_id"',
    );
  }
}
