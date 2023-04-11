import { BLOCKCHAIN_NAMES } from 'src/common/constants/blockchain-names';
import type { MigrationInterface, QueryRunner } from 'typeorm';

import { FOR_MIGRATIONS_STRATEGY_NAMES } from './data/for-migrations-strategy-names';

export class AddBlockchainAndStrategyToOperations1654590346050
  implements MigrationInterface
{
  name = 'AddBlockchainAndStrategyToOperations1654590346050';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "operations" DROP COLUMN "chain_id"');

    await queryRunner.query(
      'ALTER TABLE "operations" ADD "blockchain_id" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "operations" ADD "strategy_id" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "operations" ADD CONSTRAINT "FK_6bf71d5e3429576b5ee28ccad61" FOREIGN KEY ("blockchain_id") REFERENCES "blockchains"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "operations" ADD CONSTRAINT "FK_bd2edcbb0f52da3307b4cb7f78d" FOREIGN KEY ("strategy_id") REFERENCES "strategies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );

    const blockchain = await queryRunner.manager.query(
      `SELECT id FROM "blockchains" WHERE name = '${BLOCKCHAIN_NAMES.BNB}'`,
    );
    const strategy = await queryRunner.manager.query(
      `SELECT id FROM "strategies" WHERE name = '${FOR_MIGRATIONS_STRATEGY_NAMES.LRS_STRATEGY}'`,
    );
    await queryRunner.query(
      `UPDATE "operations" SET "blockchain_id" = ${blockchain[0].id}, "strategy_id" = ${strategy[0].id}`,
    );

    await queryRunner.query(
      'ALTER TABLE "operations" ALTER COLUMN "blockchain_id" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "operations" ALTER COLUMN  "strategy_id" SET NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "operations" DROP CONSTRAINT "FK_bd2edcbb0f52da3307b4cb7f78d"',
    );
    await queryRunner.query(
      'ALTER TABLE "operations" DROP CONSTRAINT "FK_6bf71d5e3429576b5ee28ccad61"',
    );
    await queryRunner.query(
      'ALTER TABLE "operations" DROP COLUMN "strategy_id"',
    );
    await queryRunner.query(
      'ALTER TABLE "operations" DROP COLUMN "blockchain_id"',
    );

    await queryRunner.query('ALTER TABLE "operations" ADD "chain_id" integer');
  }
}
