import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlatformToPairs1656514099781 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.query(
      `update pairs p
      set data = jsonb_set(p.data::jsonb, '{ platform }', concat('"', c.platform, '"')::jsonb)
      from contracts c
      where p.data->>'lpAddress' = c.address`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(queryRunner: QueryRunner): Promise<void> {
    void null;
  }
}
