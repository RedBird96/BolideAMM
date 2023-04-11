/* eslint-disable max-len */
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePairEntity1656945049287 implements MigrationInterface {
  name = 'RemovePairEntity1656945049287';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "strategy_pairs" DROP CONSTRAINT "FK_6e647d937935e7021d229bd8731"',
    );

    await queryRunner.query(
      `update strategy_pairs sp
      set pair_id = c.id
      from contracts c
      inner join pairs p on c.data->'pid' = p.data->'pid' and c.platform::text = p.data->>'platform'
      where c.type = 'LP_TOKEN' and sp.pair_id = p.id;`,
    );

    await queryRunner.query(
      'ALTER TABLE "strategy_pairs" ADD CONSTRAINT "FK_6e647d937935e7021d229bd8731" FOREIGN KEY ("pair_id") REFERENCES "contracts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );

    await queryRunner.dropTable('pairs');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "strategy_pairs" DROP CONSTRAINT "FK_6e647d937935e7021d229bd8731"',
    );

    await queryRunner.query(
      'CREATE TABLE "pairs" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "data" jsonb DEFAULT \'{}\', CONSTRAINT "PK_bfc550b07b52c37db12aa7d8e69" PRIMARY KEY ("id"))',
    );

    await queryRunner.query(
      'ALTER TABLE "strategy_pairs" ADD CONSTRAINT "FK_6e647d937935e7021d229bd8731" FOREIGN KEY ("pair_id") REFERENCES "pairs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }
}
