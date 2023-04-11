import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Platforms1655914926967 implements MigrationInterface {
  name = 'Platforms1655914926967';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TYPE "public"."apy-stat_platform_enum" RENAME TO "apy-stat_platform_enum_old"',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"platform_enum\" AS ENUM('APESWAP', 'PANCAKESWAP', 'UNISWAP', 'BISWAP', 'BOLIDE', 'VENUS')",
    );
    await queryRunner.query(
      // eslint-disable-next-line prettier/prettier
      "CREATE TYPE \"public\".\"platform_enum_broken\" AS ENUM('VENUS', 'venus')",
    );
    await queryRunner.query(
      'ALTER TABLE "apy-stat" ALTER COLUMN "platform" TYPE "public"."platform_enum_broken" USING "platform"::"text"::"public"."platform_enum_broken"',
    );
    await queryRunner.query(
      "UPDATE \"apy-stat\" SET platform = 'VENUS' WHERE platform = 'venus';",
    );
    await queryRunner.query(
      'ALTER TABLE "apy-stat" ALTER COLUMN "platform" TYPE "public"."platform_enum" USING "platform"::"text"::"public"."platform_enum"',
    );
    await queryRunner.query(
      'ALTER TYPE "public"."lending-stat_platform_enum" RENAME TO "lending-stat_platform_enum_old"',
    );
    await queryRunner.query(
      'ALTER TABLE "lending-stat" ALTER COLUMN "platform" TYPE "public"."platform_enum_broken" USING "platform"::"text"::"public"."platform_enum_broken"',
    );
    await queryRunner.query(
      "UPDATE \"lending-stat\" SET platform = 'VENUS' WHERE platform = 'venus';",
    );
    await queryRunner.query(
      'ALTER TABLE "lending-stat" ALTER COLUMN "platform" TYPE "public"."platform_enum" USING "platform"::"text"::"public"."platform_enum"',
    );
    await queryRunner.query(
      'DROP TYPE "public"."lending-stat_platform_enum_old"',
    );
    await queryRunner.query('DROP TYPE "public"."apy-stat_platform_enum_old"');
    await queryRunner.query('DROP TYPE "public"."platform_enum_broken"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TYPE "public"."lending-stat_platform_enum_old" AS ENUM(\'venus\')',
    );
    await queryRunner.query(
      'ALTER TABLE "lending-stat" ALTER COLUMN "platform" TYPE "public"."lending-stat_platform_enum_old" USING "platform"::"text"::"public"."lending-stat_platform_enum_old"',
    );
    await queryRunner.query(
      'ALTER TYPE "public"."lending-stat_platform_enum_old" RENAME TO "lending-stat_platform_enum"',
    );
    await queryRunner.query(
      'CREATE TYPE "public"."apy-stat_platform_enum_old" AS ENUM(\'venus\')',
    );
    await queryRunner.query(
      'ALTER TABLE "apy-stat" ALTER COLUMN "platform" TYPE "public"."apy-stat_platform_enum_old" USING "platform"::"text"::"public"."apy-stat_platform_enum_old"',
    );
    await queryRunner.query(
      'ALTER TYPE "public"."apy-stat_platform_enum_old" RENAME TO "apy-stat_platform_enum"',
    );
    await queryRunner.query('DROP TYPE "public"."platform_enum"');
    await queryRunner.query('DROP TYPE "public"."platform_enum_broken"');
  }
}
