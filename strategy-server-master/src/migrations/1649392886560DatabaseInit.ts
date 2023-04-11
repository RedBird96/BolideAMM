/* eslint-disable @typescript-eslint/no-unused-vars */
import type { MigrationInterface, QueryRunner } from 'typeorm';

import { PUBLIC_SCHEMA_DUMP } from './data/init-db';

export class DatabaseInit1649392886560 implements MigrationInterface {
  public async up(_queryRunner: QueryRunner): Promise<void> {
    await _queryRunner.query(PUBLIC_SCHEMA_DUMP(process.env.DB_USERNAME));
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    void null;
  }
}
