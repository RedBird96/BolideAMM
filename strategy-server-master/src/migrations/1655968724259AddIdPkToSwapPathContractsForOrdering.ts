import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIdPkToSwapPathContractsForOrdering1655968724259
  implements MigrationInterface
{
  name = 'AddIdPkToSwapPathContractsForOrdering1655968724259';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" DROP CONSTRAINT "FK_73ff7c1b88fcbce23be6397fc1c"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" DROP CONSTRAINT "FK_e12569ac1bfdb78dcc24fa4e7c5"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" ADD "id" SERIAL NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" DROP CONSTRAINT "PK_a1fb0b990aaab8a4291b663a7a2"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" ADD CONSTRAINT "PK_c54e0c15ed25a5d169823fcb200" PRIMARY KEY ("id")',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" ADD CONSTRAINT "UQ_a1fb0b990aaab8a4291b663a7a2" UNIQUE ("swap_path_id", "contracts_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" ADD CONSTRAINT "FK_73ff7c1b88fcbce23be6397fc1c" FOREIGN KEY ("swap_path_id") REFERENCES "swap_paths"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" ADD CONSTRAINT "FK_e12569ac1bfdb78dcc24fa4e7c5" FOREIGN KEY ("contracts_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" DROP CONSTRAINT "FK_e12569ac1bfdb78dcc24fa4e7c5"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" DROP CONSTRAINT "FK_73ff7c1b88fcbce23be6397fc1c"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" DROP CONSTRAINT "UQ_a1fb0b990aaab8a4291b663a7a2"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" DROP CONSTRAINT "PK_c54e0c15ed25a5d169823fcb200"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" DROP COLUMN "updated_at"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" DROP COLUMN "created_at"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" ADD CONSTRAINT "PK_a1fb0b990aaab8a4291b663a7a2" PRIMARY KEY ("contracts_id", "swap_path_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" DROP COLUMN "id"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" ADD CONSTRAINT "FK_e12569ac1bfdb78dcc24fa4e7c5" FOREIGN KEY ("contracts_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" ADD CONSTRAINT "FK_73ff7c1b88fcbce23be6397fc1c" FOREIGN KEY ("swap_path_id") REFERENCES "swap_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
  }
}
