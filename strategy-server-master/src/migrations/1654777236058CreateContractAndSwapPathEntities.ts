/* eslint-disable max-len */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateContractAndSwapPathEntities1654777236058
  implements MigrationInterface
{
  name = 'CreateContractAndSwapPathEntities1654777236058';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TYPE \"public\".\"contracts_platform_enum\" AS ENUM('APESWAP', 'PANCAKESWAP', 'UNISWAP', 'BISWAP', 'BOLIDE', 'VENUS')",
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"contracts_type_enum\" AS ENUM('TOKEN', 'INNER_TOKEN', 'ROUTER', 'MASTER', 'LP_TOKEN', 'STR_LOGIC', 'STR_STORAGE')",
    );
    await queryRunner.query(
      'CREATE TABLE "contracts" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "platform" "public"."contracts_platform_enum", "type" "public"."contracts_type_enum" NOT NULL, "name" character varying NOT NULL, "address" character varying NOT NULL, "data" jsonb, "blockchain_id" integer NOT NULL, CONSTRAINT "UQ_71a93ca1569ed761dced911f0a4" UNIQUE ("address"), CONSTRAINT "UQ_8c737e756917efe9e783fed60b1" UNIQUE ("name", "platform", "blockchain_id"), CONSTRAINT "PK_2c7b8f3a7b1acdd49497d83d0fb" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"swap_path_platform_enum\" AS ENUM('APESWAP', 'PANCAKESWAP', 'UNISWAP', 'BISWAP', 'BOLIDE', 'VENUS')",
    );
    await queryRunner.query(
      'CREATE TABLE "swap_paths" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "platform" "public"."swap_path_platform_enum" NOT NULL, "blockchain_id" integer NOT NULL, "from_token_id" integer NOT NULL, "to_token_id" integer NOT NULL, CONSTRAINT "UQ_39250faf478a5441e9556adf3a1" UNIQUE ("blockchain_id", "platform", "from_token_id", "to_token_id"), CONSTRAINT "PK_440d209c494fb01fe64766155ea" PRIMARY KEY ("id"))',
    );
    await queryRunner.query(
      'CREATE TABLE "swap_paths_contracts" ("swap_path_id" integer NOT NULL, "contracts_id" integer NOT NULL, CONSTRAINT "PK_a1fb0b990aaab8a4291b663a7a2" PRIMARY KEY ("swap_path_id", "contracts_id"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_73ff7c1b88fcbce23be6397fc1" ON "swap_paths_contracts" ("swap_path_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_e12569ac1bfdb78dcc24fa4e7c" ON "swap_paths_contracts" ("contracts_id") ',
    );
    await queryRunner.query(
      'ALTER TABLE "contracts" ADD CONSTRAINT "FK_c2e9acfc32d4821a7ce8b067b93" FOREIGN KEY ("blockchain_id") REFERENCES "blockchains"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" ADD CONSTRAINT "FK_acfdbee5099469016c7619d4e78" FOREIGN KEY ("blockchain_id") REFERENCES "blockchains"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" ADD CONSTRAINT "FK_f918593bd2bc8ac296ff0f8870f" FOREIGN KEY ("from_token_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" ADD CONSTRAINT "FK_5452c7234b6fcfcd9b5a5bc233b" FOREIGN KEY ("to_token_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" ADD CONSTRAINT "FK_73ff7c1b88fcbce23be6397fc1c" FOREIGN KEY ("swap_path_id") REFERENCES "swap_paths"("id") ON DELETE CASCADE ON UPDATE CASCADE',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" ADD CONSTRAINT "FK_e12569ac1bfdb78dcc24fa4e7c5" FOREIGN KEY ("contracts_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE',
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
      'ALTER TABLE "swap_paths" DROP CONSTRAINT "FK_5452c7234b6fcfcd9b5a5bc233b"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" DROP CONSTRAINT "FK_f918593bd2bc8ac296ff0f8870f"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" DROP CONSTRAINT "FK_acfdbee5099469016c7619d4e78"',
    );
    await queryRunner.query(
      'ALTER TABLE "contracts" DROP CONSTRAINT "FK_c2e9acfc32d4821a7ce8b067b93"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_e12569ac1bfdb78dcc24fa4e7c"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_73ff7c1b88fcbce23be6397fc1"',
    );
    await queryRunner.query('DROP TABLE "swap_paths_contracts"');
    await queryRunner.query('DROP TABLE "swap_paths"');
    await queryRunner.query('DROP TYPE "public"."swap_path_platform_enum"');
    await queryRunner.query('DROP TABLE "contracts"');
    await queryRunner.query('DROP TYPE "public"."contracts_type_enum"');
    await queryRunner.query('DROP TYPE "public"."contracts_platform_enum"');
  }
}
