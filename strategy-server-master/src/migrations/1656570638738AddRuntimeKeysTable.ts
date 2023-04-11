/* eslint-disable max-len */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRuntimeKeysTable1656570638738 implements MigrationInterface {
  name = 'AddRuntimeKeysTable1656570638738';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE "runtime_keys" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "description" character varying, CONSTRAINT "UQ_b1367c4e50b3a1f52802757555b" UNIQUE ("name"), CONSTRAINT "PK_2c15cae96ebb81d095a666aae02" PRIMARY KEY ("id"))',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "runtime_keys"');
  }
}
