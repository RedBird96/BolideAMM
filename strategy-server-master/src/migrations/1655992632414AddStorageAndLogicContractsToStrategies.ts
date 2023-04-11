import { BLOCKCHAIN_NAMES } from 'src/common/constants/blockchain-names';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStorageAndLogicContractsToStrategies1655992632414
  implements MigrationInterface
{
  name = 'AddStorageAndLogicContractsToStrategies1655992632414';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "strategies" ADD "logic_contract_id" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ADD CONSTRAINT "UQ_147113d77c27a6c5fe3728313a2" UNIQUE ("logic_contract_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ADD "storage_contract_id" integer',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ADD CONSTRAINT "FK_147113d77c27a6c5fe3728313a2" FOREIGN KEY ("logic_contract_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ADD CONSTRAINT "FK_105963f9b95aa3b51f4ffd2ff04" FOREIGN KEY ("storage_contract_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );

    const blockchain = await queryRunner.manager.query(
      `SELECT id FROM "blockchains" WHERE name = '${BLOCKCHAIN_NAMES.BNB}'`,
    );
    const logicContract = await queryRunner.manager.query(
      `SELECT id FROM "contracts" WHERE blockchain_id = ${blockchain[0].id} AND type = '${CONTRACT_TYPES.STR_LOGIC}'`,
    );
    const storageContract = await queryRunner.manager.query(
      `SELECT id FROM "contracts" WHERE blockchain_id = ${blockchain[0].id} AND type = '${CONTRACT_TYPES.STR_STORAGE}'`,
    );
    await queryRunner.query(
      `UPDATE "strategies" SET "logic_contract_id" = ${logicContract[0].id}, "storage_contract_id" = ${storageContract[0].id}`,
    );

    await queryRunner.query(
      'ALTER TABLE "strategies" ALTER COLUMN "logic_contract_id" SET NOT NULL',
    );

    await queryRunner.query(
      'ALTER TABLE "strategies" ALTER COLUMN "storage_contract_id" SET NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "strategies" DROP CONSTRAINT "FK_105963f9b95aa3b51f4ffd2ff04"',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" DROP CONSTRAINT "FK_147113d77c27a6c5fe3728313a2"',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" DROP COLUMN "storage_contract_id"',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" DROP CONSTRAINT "UQ_147113d77c27a6c5fe3728313a2"',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" DROP COLUMN "logic_contract_id"',
    );
  }
}
