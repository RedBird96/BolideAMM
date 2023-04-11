import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PairSeq1651827935483 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "SELECT setval(pg_get_serial_sequence('pairs', 'id'), coalesce(max(id), 0) + 1 , false) FROM pairs;",
    );
    await queryRunner.query(
      "SELECT setval(pg_get_serial_sequence('strategies', 'id'), coalesce(max(id), 0) + 1 , false) FROM strategies;",
    );
    await queryRunner.query(
      "SELECT setval(pg_get_serial_sequence('strategy_pairs', 'id'), coalesce(max(id), 0) + 1 , false) FROM strategy_pairs;",
    );
    await queryRunner.query(
      "CREATE UNIQUE INDEX IF NOT EXISTS pairs_data_lp_address_idx ON pairs( (data->>'lpAddress') ) ;",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(queryRunner: QueryRunner): Promise<void> {
    void null;
  }
}
