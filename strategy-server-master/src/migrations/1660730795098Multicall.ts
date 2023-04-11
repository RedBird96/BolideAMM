import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { ContractEntity } from 'src/modules/contracts/contract.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Multicall1660730795098 implements MigrationInterface {
  name = 'Multicall1660730795098';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TYPE "public"."contracts_type_enum" RENAME TO "contracts_type_enum_old"',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"contracts_type_enum\" AS ENUM('TOKEN', 'INNER_TOKEN', 'ROUTER', 'MASTER', 'LP_TOKEN', 'STR_LOGIC', 'STR_STORAGE', 'COMPTROLLER', 'ORACLE', 'MULTICALL')",
    );
    await queryRunner.query(
      'ALTER TABLE "contracts" ALTER COLUMN "type" TYPE "public"."contracts_type_enum" USING "type"::"text"::"public"."contracts_type_enum"',
    );
    await queryRunner.query('DROP TYPE "public"."contracts_type_enum_old"');

    await queryRunner.manager.insert(ContractEntity, {
      blockchainId: 1,
      type: CONTRACT_TYPES.MULTICALL,
      name: 'Multicall2',
      address: '0xfF6FD90A470Aaa0c1B8A54681746b07AcdFedc9B',
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DELETE FROM contracts WHERE type = 'MULTICALL'");

    await queryRunner.query(
      "CREATE TYPE \"public\".\"contracts_type_enum_old\" AS ENUM('TOKEN', 'INNER_TOKEN', 'ROUTER', 'MASTER', 'LP_TOKEN', 'STR_LOGIC', 'STR_STORAGE', 'COMPTROLLER', 'ORACLE')",
    );
    await queryRunner.query(
      'ALTER TABLE "contracts" ALTER COLUMN "type" TYPE "public"."contracts_type_enum_old" USING "type"::"text"::"public"."contracts_type_enum_old"',
    );
    await queryRunner.query('DROP TYPE "public"."contracts_type_enum"');
    await queryRunner.query(
      'ALTER TYPE "public"."contracts_type_enum_old" RENAME TO "contracts_type_enum"',
    );
  }
}
