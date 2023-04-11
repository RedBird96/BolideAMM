import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTransactionToOperationFK1656404605849
  implements MigrationInterface
{
  name = 'AddTransactionToOperationFK1656404605849';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DELETE FROM "transactions" WHERE "uid" NOT IN (SELECT "id"::text FROM "operations") or "uid" IS NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "transactions" ALTER COLUMN "uid" TYPE uuid USING uid::uuid',
    );
    await queryRunner.query(
      'ALTER TABLE "transactions" ALTER COLUMN "uid" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "transactions" ADD CONSTRAINT "FK_c3dcba0b0a4c2ed3442124475bf" FOREIGN KEY ("uid") REFERENCES "operations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "transactions" DROP CONSTRAINT "FK_c3dcba0b0a4c2ed3442124475bf"',
    );
    await queryRunner.query(
      'ALTER TABLE "transactions" ALTER COLUMN "uid" DROP NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "transactions" ALTER COLUMN "uid" TYPE character varying USING uid::text',
    );
  }
}
