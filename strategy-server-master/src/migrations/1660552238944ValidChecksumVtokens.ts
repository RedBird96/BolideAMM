import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { ContractEntity } from 'src/modules/contracts/contract.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

import { mainnetTokens } from './data/seeds/tokens';

export class ValidChecksumVtokens1660552238944 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tokens = await queryRunner.manager.find(ContractEntity, {
      blockchainId: 1,
      type: CONTRACT_TYPES.INNER_TOKEN,
    });

    const validChecksumTokens = Object.values(mainnetTokens);

    for (const dbToken of tokens) {
      const token = dbToken.toDto();

      for (const validChecksumToken of validChecksumTokens) {
        if (
          token.data.baseContractAddress.toLowerCase() ===
          validChecksumToken.address.toLowerCase()
        ) {
          const baseContractAddress = validChecksumToken.address;
          const newData = { ...token.data, baseContractAddress };

          await queryRunner.manager.update(
            ContractEntity,
            {
              id: token.id,
            },
            {
              data: newData,
            },
          );
        }
      }
    }
  }

  public async down(): Promise<void> {
    void null;
  }
}
