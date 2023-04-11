import { BLOCKCHAIN_NAMES } from 'src/common/constants/blockchain-names';
import { BlockchainEntity } from 'src/modules/blockchains/blockchain.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

import { settings as defaultBnbSettings } from './data/seeds/bnb-settings';

export class SeedBnbSettings1653898255714 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const bnbBlockchain = new BlockchainEntity();
    bnbBlockchain.name = BLOCKCHAIN_NAMES.BNB;
    bnbBlockchain.settings = defaultBnbSettings;

    await queryRunner.manager.save(BlockchainEntity, bnbBlockchain);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(queryRunner: QueryRunner): Promise<void> {
    void null;
  }
}
