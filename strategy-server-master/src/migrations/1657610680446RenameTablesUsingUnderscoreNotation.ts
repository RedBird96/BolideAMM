/* eslint-disable max-len */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameTablesUsingUnderscoreNotation1657610680446
  implements MigrationInterface
{
  name = 'RenameTablesUsingUnderscoreNotation1657610680446';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE IF EXISTS "swap_path" RENAME TO "swap_paths"',
    );
    await queryRunner.query(
      'ALTER TABLE IF EXISTS "swap_path_contracts" RENAME TO "swap_paths_contracts"',
    );
    await queryRunner.query('ALTER TABLE "apy-stat" RENAME TO "apy_stats"');
    await queryRunner.query(
      'ALTER TABLE "lending-stat" RENAME TO "lending_stats"',
    );
    await queryRunner.query('ALTER TABLE "farm-stat" RENAME TO "farm_stats"');
    await queryRunner.query('ALTER TABLE "lrs-stat" RENAME TO "lrs_stats"');
    await queryRunner.query('DROP TABLE "claim-log"');

    await queryRunner.query(
      'ALTER TABLE "swap_paths" DROP CONSTRAINT "FK_acfdbee5099469016c7619d4e78"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" DROP CONSTRAINT "FK_f918593bd2bc8ac296ff0f8870f"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" DROP CONSTRAINT "FK_5452c7234b6fcfcd9b5a5bc233b"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" DROP CONSTRAINT "FK_73ff7c1b88fcbce23be6397fc1c"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" DROP CONSTRAINT "FK_e12569ac1bfdb78dcc24fa4e7c5"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_73ff7c1b88fcbce23be6397fc1"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_e12569ac1bfdb78dcc24fa4e7c"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" DROP CONSTRAINT "UQ_39250faf478a5441e9556adf3a1"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" DROP CONSTRAINT "UQ_a1fb0b990aaab8a4291b663a7a2"',
    );

    await queryRunner.query(
      'ALTER SEQUENCE "apy-stat_id_seq" RENAME TO apy_stats_id_seq',
    );
    await queryRunner.query(
      'ALTER SEQUENCE "lending-stat_id_seq" RENAME TO lending_stats_id_seq',
    );
    await queryRunner.query(
      'ALTER SEQUENCE "farm-stat_id_seq" RENAME TO farm_stats_id_seq',
    );
    await queryRunner.query(
      'ALTER SEQUENCE "lrs-stat_id_seq" RENAME TO lrs_stats_id_seq',
    );

    await queryRunner.query(
      'CREATE INDEX "IDX_b64ac023176cb796ec732d7dfd" ON "swap_paths_contracts" ("swap_path_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_3da6202c40f04efda109341cd3" ON "swap_paths_contracts" ("contracts_id") ',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" ADD CONSTRAINT "UQ_80fa59cffb7a4304823e598e70a" UNIQUE ("blockchain_id", "platform", "from_token_id", "to_token_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" ADD CONSTRAINT "UQ_247e8665ea0afc40291e7f201fe" UNIQUE ("swap_path_id", "contracts_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" ADD CONSTRAINT "FK_888d94c9bcc00d33190673591f3" FOREIGN KEY ("blockchain_id") REFERENCES "blockchains"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" ADD CONSTRAINT "FK_2eb750d4bbfbc49c5486d30b8c9" FOREIGN KEY ("from_token_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" ADD CONSTRAINT "FK_afc64f70413c5e4c82825dfa94e" FOREIGN KEY ("to_token_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" ADD CONSTRAINT "FK_b64ac023176cb796ec732d7dfda" FOREIGN KEY ("swap_path_id") REFERENCES "swap_paths"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" ADD CONSTRAINT "FK_3da6202c40f04efda109341cd39" FOREIGN KEY ("contracts_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" DROP CONSTRAINT "FK_3da6202c40f04efda109341cd39"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" DROP CONSTRAINT "FK_b64ac023176cb796ec732d7dfda"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" DROP CONSTRAINT "FK_afc64f70413c5e4c82825dfa94e"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" DROP CONSTRAINT "FK_2eb750d4bbfbc49c5486d30b8c9"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" DROP CONSTRAINT "FK_888d94c9bcc00d33190673591f3"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" DROP CONSTRAINT "UQ_247e8665ea0afc40291e7f201fe"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" DROP CONSTRAINT "UQ_80fa59cffb7a4304823e598e70a"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_3da6202c40f04efda109341cd3"',
    );
    await queryRunner.query(
      'DROP INDEX "public"."IDX_b64ac023176cb796ec732d7dfd"',
    );

    await queryRunner.query(
      'ALTER SEQUENCE "apy_stats_id_seq" RENAME TO "apy-stat_id_seq"',
    );
    await queryRunner.query(
      'ALTER SEQUENCE "lending_stats_id_seq" RENAME TO "lending-stat_id_seq"',
    );
    await queryRunner.query(
      'ALTER SEQUENCE "farm_stats_id_seq" RENAME TO "farm-stat_id_seq"',
    );
    await queryRunner.query(
      'ALTER SEQUENCE "lrs_stats_id_seq" RENAME TO "lrs-stat_id_seq"',
    );

    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" ADD CONSTRAINT "UQ_a1fb0b990aaab8a4291b663a7a2" UNIQUE ("swap_path_id", "contracts_id")',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" ADD CONSTRAINT "UQ_39250faf478a5441e9556adf3a1" UNIQUE ("platform", "blockchain_id", "from_token_id", "to_token_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_e12569ac1bfdb78dcc24fa4e7c" ON "swap_paths_contracts" ("contracts_id") ',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_73ff7c1b88fcbce23be6397fc1" ON "swap_paths_contracts" ("swap_path_id") ',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" ADD CONSTRAINT "FK_e12569ac1bfdb78dcc24fa4e7c5" FOREIGN KEY ("contracts_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" ADD CONSTRAINT "FK_73ff7c1b88fcbce23be6397fc1c" FOREIGN KEY ("swap_path_id") REFERENCES "swap_paths"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" ADD CONSTRAINT "FK_5452c7234b6fcfcd9b5a5bc233b" FOREIGN KEY ("to_token_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" ADD CONSTRAINT "FK_f918593bd2bc8ac296ff0f8870f" FOREIGN KEY ("from_token_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths" ADD CONSTRAINT "FK_acfdbee5099469016c7619d4e78" FOREIGN KEY ("blockchain_id") REFERENCES "blockchains"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );

    await queryRunner.query(
      'CREATE TABLE public."claim-log" (id integer NOT NULL, created_at timestamp without time zone DEFAULT now() NOT NULL, updated_at timestamp without time zone DEFAULT now() NOT NULL, uid character varying, earn_blid numeric, price_blid numeric, earn_usd numeric, wallet character varying, last_tx_block_number integer DEFAULT 0)',
    );
    await queryRunner.query('ALTER TABLE "lrs_stats" RENAME TO "lrs-stat"');
    await queryRunner.query('ALTER TABLE "farm_stats" RENAME TO "farm-stat"');
    await queryRunner.query('ALTER TABLE "apy_stats" RENAME TO "apy-stat"');
    await queryRunner.query(
      'ALTER TABLE "lending_stats" RENAME TO "lending-stat"',
    );
    await queryRunner.query(
      'ALTER TABLE "swap_paths_contracts" RENAME TO "swap_path_contracts"',
    );
    await queryRunner.query('ALTER TABLE "swap_paths" RENAME TO "swap_path"');
  }
}
