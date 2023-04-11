import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPlatformEnum1657201474643 implements MigrationInterface {
  name = 'FixPlatformEnum1657201474643';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TYPE "public"."platform_enum" ADD VALUE \'BINANCE\'',
    );

    await queryRunner.query(
      'ALTER TABLE "contracts" ALTER COLUMN "platform" TYPE "public"."platform_enum" USING "platform"::"text"::"public"."platform_enum"',
    );
    await queryRunner.query('DROP TYPE "public"."contracts_platform_enum"');

    await queryRunner.query(
      'ALTER TABLE IF EXISTS "swap_paths" ALTER COLUMN "platform" TYPE "public"."platform_enum" USING "platform"::"text"::"public"."platform_enum"',
    );
    await queryRunner.query(
      'ALTER TABLE IF EXISTS "swap_path" ALTER COLUMN "platform" TYPE "public"."platform_enum" USING "platform"::"text"::"public"."platform_enum"',
    );
    await queryRunner.query('DROP TYPE "public"."swap_path_platform_enum"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TYPE "public"."platform_enum" RENAME TO "platform_enum_old"',
    );
    await queryRunner.query(
      "CREATE TYPE \"public\".\"platform_enum\" AS ENUM('APESWAP', 'PANCAKESWAP', 'UNISWAP', 'BISWAP', 'BOLIDE', 'VENUS')",
    );

    await queryRunner.query(
      'ALTER TABLE "lending-stat" ALTER COLUMN "platform" TYPE "public"."platform_enum" USING "platform"::"text"::"public"."platform_enum"',
    );
    await queryRunner.query(
      'ALTER TABLE "apy-stat" ALTER COLUMN "platform" TYPE "public"."platform_enum" USING "platform"::"text"::"public"."platform_enum"',
    );

    await queryRunner.query(
      "CREATE TYPE \"public\".\"swap_path_platform_enum\" AS ENUM('APESWAP', 'PANCAKESWAP', 'UNISWAP', 'BISWAP', 'BOLIDE', 'VENUS')",
    );
    await queryRunner.query(
      'ALTER TABLE IF EXISTS "swap_paths" ALTER COLUMN "platform" TYPE "public"."swap_path_platform_enum" USING "platform"::"text"::"public"."swap_path_platform_enum"',
    );
    await queryRunner.query(
      'ALTER TABLE IF EXISTS "swap_path" ALTER COLUMN "platform" TYPE "public"."swap_path_platform_enum" USING "platform"::"text"::"public"."swap_path_platform_enum"',
    );

    await queryRunner.query(
      "CREATE TYPE \"public\".\"contracts_platform_enum\" AS ENUM('APESWAP', 'PANCAKESWAP', 'UNISWAP', 'BISWAP', 'BOLIDE', 'VENUS')",
    );
    await queryRunner.query(
      'ALTER TABLE "contracts" ALTER COLUMN "platform" TYPE "public"."contracts_platform_enum" USING "platform"::"text"::"public"."contracts_platform_enum"',
    );

    await queryRunner.query('DROP TYPE "public"."platform_enum_old"');
  }
}
