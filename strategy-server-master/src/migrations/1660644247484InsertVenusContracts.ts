import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertVenusContracts1660644247484 implements MigrationInterface {
  name = 'InsertVenusContracts1660644247484';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TYPE "public"."contracts_type_enum" RENAME TO "contracts_type_enum_old"',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"contracts_type_enum\" AS ENUM('TOKEN', 'INNER_TOKEN', 'ROUTER', 'MASTER', 'LP_TOKEN', 'STR_LOGIC', 'STR_STORAGE', 'COMPTROLLER', 'ORACLE')",
    );
    await queryRunner.query(
      'ALTER TABLE "contracts" ALTER COLUMN "type" TYPE "public"."contracts_type_enum" USING "type"::"text"::"public"."contracts_type_enum"',
    );
    await queryRunner.query('DROP TYPE "public"."contracts_type_enum_old"');

    await queryRunner.query(`
            INSERT INTO public.contracts (platform, type, name, address, data, blockchain_id)
            VALUES ('VENUS', 'COMPTROLLER', 'Venus Comptroller', '0xfD36E2c2a6789Db23113685031d7F16329158384', '{}', 1);
        `);

    await queryRunner.query(`
            INSERT INTO public.contracts (platform, type, name, address, data, blockchain_id)
            VALUES ('VENUS', 'ORACLE', 'Venus Oracle', '0xd8B6dA2bfEC71D684D3E2a2FC9492dDad5C3787F', '{}', 1);
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TYPE \"public\".\"contracts_type_enum_old\" AS ENUM('TOKEN', 'INNER_TOKEN', 'ROUTER', 'MASTER', 'LP_TOKEN', 'STR_LOGIC', 'STR_STORAGE')",
    );
    await queryRunner.query(
      'ALTER TABLE "contracts" ALTER COLUMN "type" TYPE "public"."contracts_type_enum_old" USING "type"::"text"::"public"."contracts_type_enum_old"',
    );
    await queryRunner.query('DROP TYPE "public"."contracts_type_enum"');
    await queryRunner.query(
      'ALTER TYPE "public"."contracts_type_enum_old" RENAME TO "contracts_type_enum"',
    );
  }
}
