import { BLOCKCHAIN_NAMES } from 'src/common/constants/blockchain-names';
import { BlockchainEntity } from 'src/modules/blockchains/blockchain.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWeb3BatchSizeLimitBlockchainSetting1666625752026
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const web3BatchSizeLimit = 100;

    await queryRunner.manager.update(
      BlockchainEntity,
      { name: BLOCKCHAIN_NAMES.BNB },
      {
        settings: () =>
          `settings::jsonb || '{"web3BatchSizeLimit": ${web3BatchSizeLimit}}'`,
      },
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.manager.update(
      BlockchainEntity,
      { name: BLOCKCHAIN_NAMES.BNB },
      { settings: () => "settings::jsonb - 'web3BatchSizeLimit'" },
    );
  }
}
