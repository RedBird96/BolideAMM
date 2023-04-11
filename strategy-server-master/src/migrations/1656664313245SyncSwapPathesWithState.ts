import { BLOCKCHAIN_NAMES } from 'src/common/constants/blockchain-names';
import type { PLATFORMS } from 'src/common/constants/platforms';
import { getPlatformByName } from 'src/common/utils/platforms';
import { BlockchainEntity } from 'src/modules/blockchains/blockchain.entity';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { ContractEntity } from 'src/modules/contracts/contract.entity';
import { SwapPathEntity } from 'src/modules/swap-paths/swap-path.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

import { STATE } from '../../test/evm/utils/constants/state';

const mapTokensByAddress = new Map<string, ContractEntity>();

export class SyncSwapPathesWithState1656664313245
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const blockchain = await queryRunner.manager.findOne(BlockchainEntity, {
      name: BLOCKCHAIN_NAMES.BNB,
    });

    await this.prepTokensContract(queryRunner, blockchain);

    for (const [platformName, paltformPathes] of Object.entries(STATE.paths)) {
      const platform = getPlatformByName(platformName);

      if (!platform) {
        continue;
      }

      for (const [fromTokenName, fromTokenPathes] of Object.entries(
        paltformPathes,
      )) {
        for (const [toTokenName, statePath] of Object.entries(
          fromTokenPathes,
        )) {
          const tokens = (statePath as string[]).map((tokenName) =>
            mapTokensByAddress.get(tokenName),
          );

          const fromToken = tokens[0];
          const toToken = tokens[tokens.length - 1];

          if (
            fromToken.name !== fromTokenName ||
            toToken.name !== toTokenName
          ) {
            throw new Error(
              `Tokens names and addresses for swap path are mismatched for pair ${platform} ${fromTokenName}-${toTokenName}`,
            );
          }

          const dbPath = await this.getPathForTokens(
            queryRunner,
            blockchain.id,
            platform,
            fromToken.name,
            toToken.name,
          );

          let swapPathEntity;

          if (!dbPath) {
            swapPathEntity = await queryRunner.manager.save(SwapPathEntity, {
              blockchain,
              platform,
              fromToken: tokens[0],
              toToken: tokens[tokens.length - 1],
            });
          } else {
            if (dbPath.every((address, i) => statePath[i] === address)) {
              continue;
            }

            swapPathEntity = await queryRunner.manager.findOneOrFail(
              SwapPathEntity,
              {
                blockchain,
                platform,
                fromToken: tokens[0],
                toToken: tokens[tokens.length - 1],
              },
            );

            await queryRunner.query(
              `DELETE FROM public.swap_paths_contracts WHERE swap_path_id = ${swapPathEntity.id}`,
            );
          }

          for (const token of tokens.slice(1, -1)) {
            await queryRunner.query(
              `INSERT INTO public.swap_paths_contracts (swap_path_id, contracts_id) VALUES (${swapPathEntity.id}, ${token.id})`,
            );
          }
        }
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(queryRunner: QueryRunner): Promise<void> {
    void null;
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

  private async getPathForTokens(
    queryRunner: QueryRunner,
    blockchainId: number,
    platform: PLATFORMS,
    fromTokenSymbol: string,
    toTokenSymbol: string,
  ): Promise<string[]> {
    // TODO: Query via repository gets wrong order of relations.
    // With typeorm > 3 it can be written via repository methods.
    // https://github.com/typeorm/typeorm/issues/2620#issuecomment-415105642
    const res = await queryRunner.manager
      .createQueryBuilder(SwapPathEntity, 'sp')
      .innerJoin('contracts', 'c_from', 'sp.from_token_id = c_from.id')
      .innerJoin('contracts', 'c_to', 'sp.to_token_id = c_to.id')
      .leftJoin('swap_paths_contracts', 'spc', 'spc.swap_path_id = sp.id')
      .leftJoin('contracts', 'c', 'spc.contracts_id = c.id')
      .where('sp.blockchain_id = :blockchainId', { blockchainId })
      .andWhere('sp.platform = :platform', { platform })
      .andWhere('c_from.name = :fromToken', { fromToken: fromTokenSymbol })
      .andWhere('c_to.name = :toToken', { toToken: toTokenSymbol })
      .select(
        'c_from.address as from_address, c_to.address as to_address, array_remove(array_agg(c.address ORDER BY spc.id), NULL) as inner_path',
      )
      .groupBy('c_from.address, c_to.address')
      .execute();

    if (res.length === 0) {
      return null;
    }

    const path = res[0];

    return [path.from_address, ...path.inner_path, path.to_address];
  }
}
