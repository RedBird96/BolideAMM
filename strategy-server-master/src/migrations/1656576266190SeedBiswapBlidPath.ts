import { BLOCKCHAIN_NAMES } from 'src/common/constants/blockchain-names';
import { getPlatformByName } from 'src/common/utils/platforms';
import { BlockchainEntity } from 'src/modules/blockchains/blockchain.entity';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { ContractEntity } from 'src/modules/contracts/contract.entity';
import { SwapPathEntity } from 'src/modules/swap-paths/swap-path.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

import { STATE } from '../../test/evm/utils/constants/state';

const mapTokensByAddress = new Map<string, ContractEntity>();

export class SeedBiswapBlidPath1656576266190 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const blockchain = await queryRunner.manager.findOne(BlockchainEntity, {
      name: BLOCKCHAIN_NAMES.BNB,
    });

    await this.prepTokensContract(queryRunner, blockchain);

    const bsw = await queryRunner.manager.find(ContractEntity, {
      blockchain,
      name: 'BSW',
      type: CONTRACT_TYPES.TOKEN,
    });

    if (!bsw[0]) {
      throw new Error('no BSW');
    }

    const records = await queryRunner.manager.find(SwapPathEntity, {
      blockchain,
      platform: getPlatformByName('PANCAKE'),
      fromTokenId: bsw[0].id,
    });

    const isSeed = records.length === 0;

    if (isSeed) {
      for (const pathes of Object.values(STATE.paths.Pancake.BSW)) {
        const tokens = pathes.map((tokenName) =>
          mapTokensByAddress.get(tokenName),
        );

        const entity = await queryRunner.manager.save(SwapPathEntity, {
          blockchain,
          platform: getPlatformByName('PANCAKE'),
          fromToken: tokens[0],
          toToken: tokens[tokens.length - 1],
        });

        for (const token of tokens.slice(1, -1)) {
          await queryRunner.query(
            `INSERT INTO public.swap_path_contracts (swap_path_id, contracts_id) VALUES (${entity.id}, ${token.id})`,
          );
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const blockchain = await queryRunner.manager.findOne(BlockchainEntity, {
      name: BLOCKCHAIN_NAMES.BNB,
    });

    await this.prepTokensContract(queryRunner, blockchain);

    const bsw = await queryRunner.manager.find(ContractEntity, {
      blockchain,
      name: 'BSW',
      type: CONTRACT_TYPES.TOKEN,
    });

    if (!bsw[0]) {
      throw new Error('no BSW');
    }

    const records = await queryRunner.manager.find(SwapPathEntity, {
      blockchain,
      platform: getPlatformByName('PANCAKE'),
      fromTokenId: bsw[0].id,
    });

    if (records.length > 0) {
      for (const pathes of Object.values(STATE.paths.Pancake.BSW)) {
        const tokens = pathes.map((tokenName) =>
          mapTokensByAddress.get(tokenName),
        );

        const entity = await queryRunner.manager.findOne(SwapPathEntity, {
          blockchain,
          platform: getPlatformByName('PANCAKE'),
          fromToken: tokens[0],
          toToken: tokens[tokens.length - 1],
        });

        for (const token of tokens.slice(1, -1)) {
          await queryRunner.query(
            `DELETE FROM public.swap_path_contracts where swap_path_id = ${entity.id} and contracts_id = ${token.id};`,
          );
        }

        await queryRunner.manager.delete(SwapPathEntity, { id: entity.id });
      }
    }
  }

  private async prepTokensContract(
    queryRunner: QueryRunner,
    blockchain: BlockchainEntity,
  ) {
    for (const [name] of Object.entries(STATE.TokenAddress)) {
      const token = await queryRunner.manager.find(ContractEntity, {
        blockchain,
        name,
        type: CONTRACT_TYPES.TOKEN,
      });

      mapTokensByAddress.set(token[0].address, token[0]);
    }
  }
}
