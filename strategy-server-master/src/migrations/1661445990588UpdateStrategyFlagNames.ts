import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateStrategyFlagNames1661445990588
  implements MigrationInterface
{
  name = 'UpdateStrategyFlagNames1661445990588';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `update strategies
       set settings = settings - 'shouldNotifyIfLpPairAdded' ||
                      jsonb_build_object('isNotifyIfLpPairAdded', settings -> 'shouldNotifyIfLpPairAdded')
       where settings ? 'shouldNotifyIfLpPairAdded'
       returning *;`,
    );

    await queryRunner.query(`
      update strategies
      set settings = settings - 'shouldNotifyIfLpPairRemoved' ||
                     jsonb_build_object('isNotifyIfLpPairRemoved', settings -> 'shouldNotifyIfLpPairRemoved')
      where settings ? 'shouldNotifyIfLpPairRemoved'
      returning *;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `update strategies
       set settings = settings - 'isNotifyIfLpPairAdded' ||
                      jsonb_build_object('shouldNotifyIfLpPairAdded', settings -> 'isNotifyIfLpPairAdded')
       where settings ? 'isNotifyIfLpPairAdded'
       returning *;`,
    );

    await queryRunner.query(`
      update strategies
      set settings = settings - 'isNotifyIfLpPairRemoved' ||
                     jsonb_build_object('shouldNotifyIfLpPairRemoved', settings -> 'isNotifyIfLpPairRemoved')
      where settings ? 'isNotifyIfLpPairRemoved'
      returning *;
    `);
  }
}
