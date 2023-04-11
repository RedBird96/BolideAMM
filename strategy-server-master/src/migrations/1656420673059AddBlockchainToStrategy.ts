import { BLOCKCHAIN_NAMES } from 'src/common/constants/blockchain-names';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBlockchainToStrategy1656420673059
  implements MigrationInterface
{
  name = 'AddBlockchainToStrategy1656420673059';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "strategies" ADD "blockchain_id" integer',
    );

    const blockchain = await queryRunner.manager.query(
      `SELECT id FROM "blockchains" WHERE name = '${BLOCKCHAIN_NAMES.BNB}'`,
    );
    await queryRunner.query(
      `UPDATE "strategies" SET "blockchain_id" = ${blockchain[0].id}`,
    );

    await queryRunner.query(
      'ALTER TABLE "strategies" ALTER COLUMN "blockchain_id" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" ADD CONSTRAINT "FK_85f22b0309cb7cd813f153c2aeb" FOREIGN KEY ("blockchain_id") REFERENCES "blockchains"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "strategies" DROP CONSTRAINT "FK_85f22b0309cb7cd813f153c2aeb"',
    );
    await queryRunner.query(
      'ALTER TABLE "strategies" DROP COLUMN "blockchain_id"',
    );
  }
}
