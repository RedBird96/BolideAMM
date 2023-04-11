import type { MigrationInterface, QueryRunner } from 'typeorm';

import { ADMIN_SERVER_DATA_DUMP } from './data/admin-server-db';

export class SeedAdminServer1650550142036 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(ADMIN_SERVER_DATA_DUMP);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_queryRunner: QueryRunner): Promise<void> {
    void null;
  }
}
