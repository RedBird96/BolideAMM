import { BLOCKCHAIN_NAMES } from 'src/common/constants/blockchain-names';
import { PLATFORMS } from 'src/common/constants/platforms';
import { getPlatformByName } from 'src/common/utils/platforms';
import { BlockchainEntity } from 'src/modules/blockchains/blockchain.entity';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { ContractEntity } from 'src/modules/contracts/contract.entity';
import { SwapPathEntity } from 'src/modules/swap-paths/swap-path.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

import { STATE } from '../../test/evm/utils/constants/state';
import { FOR_MIGRATIONS_STRATEGY_NAMES } from './data/for-migrations-strategy-names';

let blockchain: BlockchainEntity;
const mapTokensByName = new Map<string, ContractEntity>();
const mapTokensByAddress = new Map<string, ContractEntity>();

export class SeedStateData1654845454303 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    blockchain = await queryRunner.manager.findOne(BlockchainEntity, {
      name: BLOCKCHAIN_NAMES.BNB,
    });

    await this.createTokensContract(queryRunner);

    await this.createVenusTokensContract(queryRunner);

    await this.createBolideContracts(queryRunner);

    await this.createLpContracts(queryRunner);

    await this.createSwapContracts(queryRunner);

    await this.createSwapPathes(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'TRUNCATE TABLE "swap_paths_contracts", "swap_paths", "contracts" RESTART IDENTITY',
    );
  }

  private async createTokensContract(queryRunner: QueryRunner) {
    for (const [name, address] of Object.entries(STATE.TokenAddress)) {
      const token = await queryRunner.manager.save(ContractEntity, {
        blockchain,
        name,
        address,
        type: CONTRACT_TYPES.TOKEN,
      });

      mapTokensByName.set(name, token);
      mapTokensByAddress.set(token.address, token);
    }
  }

  private async createVenusTokensContract(queryRunner: QueryRunner) {
    for (const data of STATE.venusTokens) {
      const baseToken = mapTokensByName.get(data.asset);
      await queryRunner.manager.save(ContractEntity, {
        blockchain,
        name: `v${data.asset}`,
        address: data.vAddress,
        type: CONTRACT_TYPES.INNER_TOKEN,
        platform: PLATFORMS.VENUS,
        data: {
          baseContractId: baseToken.id,
          baseContractAddress: baseToken.address,
        },
      });
    }
  }

  private async createBolideContracts(queryRunner: QueryRunner) {
    const approvedAddresses = STATE.storageTokens.map((token) => token.address);

    await queryRunner.manager.save(ContractEntity, {
      blockchain,
      platform: PLATFORMS.BOLIDE,
      type: CONTRACT_TYPES.STR_STORAGE,
      name: `Storage of ${FOR_MIGRATIONS_STRATEGY_NAMES.LRS_STRATEGY}`,
      address: STATE.storageAddress,
      data: {
        approvedTokens: approvedAddresses,
      },
    });

    await queryRunner.manager.save(ContractEntity, {
      blockchain,
      platform: PLATFORMS.BOLIDE,
      type: CONTRACT_TYPES.STR_LOGIC,
      name: `Logic of ${FOR_MIGRATIONS_STRATEGY_NAMES.LRS_STRATEGY}`,
      address: STATE.logicAddress,
    });
  }

  private async createLpContracts(queryRunner: QueryRunner) {
    for (const data of STATE.farms) {
      const platform = getPlatformByName(data.market);

      if (!platform) {
        continue;
      }

      const fromToken = mapTokensByName.get(data.token1);
      const toToken = mapTokensByName.get(data.token2);

      await queryRunner.manager.save(ContractEntity, {
        blockchain,
        platform,
        type: CONTRACT_TYPES.LP_TOKEN,
        name: `${fromToken.name}-${toToken.name}`,
        address: data.lpAddress,
        data: {
          fromTokenId: fromToken.id,
          toTokenId: toToken.id,
          pid: data.pid,
          isBorrowable: true,
        },
      });
    }
  }

  private async createSwapContracts(queryRunner: QueryRunner) {
    await queryRunner.manager.save(ContractEntity, {
      blockchain,
      platform: PLATFORMS.APESWAP,
      type: CONTRACT_TYPES.MASTER,
      name: 'Apeswap Master',
      address: STATE.apeSwapMasterChief,
    });

    await queryRunner.manager.save(ContractEntity, {
      blockchain,
      platform: PLATFORMS.APESWAP,
      type: CONTRACT_TYPES.ROUTER,
      name: 'Apeswap Router',
      address: STATE.apeSwapRouter,
    });

    await queryRunner.manager.save(ContractEntity, {
      blockchain,
      platform: PLATFORMS.PANCAKESWAP,
      type: CONTRACT_TYPES.MASTER,
      name: 'Pancakeswap Master',
      address: STATE.pancakeSwapMasterChief,
    });

    await queryRunner.manager.save(ContractEntity, {
      blockchain,
      platform: PLATFORMS.PANCAKESWAP,
      type: CONTRACT_TYPES.ROUTER,
      name: 'Pancakeswap Router',
      address: STATE.pancakeSwapRouter,
    });

    await queryRunner.manager.save(ContractEntity, {
      blockchain,
      platform: PLATFORMS.BISWAP,
      type: CONTRACT_TYPES.MASTER,
      name: 'Biswap Master',
      address: STATE.biSwapMasterChief,
    });

    await queryRunner.manager.save(ContractEntity, {
      blockchain,
      platform: PLATFORMS.BISWAP,
      type: CONTRACT_TYPES.ROUTER,
      name: 'Biswap Router',
      address: STATE.biSwapRouter,
    });
  }

  private async createSwapPathes(queryRunner: QueryRunner) {
    for (const [name, paltformPathes] of Object.entries(STATE.paths)) {
      const platform = getPlatformByName(name);

      if (!platform) {
        continue;
      }

      for (const fromTokenPathes of Object.values(paltformPathes)) {
        for (const pathes of Object.values(fromTokenPathes)) {
          const tokens = (pathes as string[]).map((tokenName) =>
            mapTokensByAddress.get(tokenName),
          );

          const entity = await queryRunner.manager.save(SwapPathEntity, {
            blockchain,
            platform,
            fromToken: tokens[0],
            toToken: tokens[tokens.length - 1],
          });

          for (const token of tokens.slice(1, -1)) {
            await queryRunner.query(
              `INSERT INTO public.swap_paths_contracts (swap_path_id, contracts_id) VALUES (${entity.id}, ${token.id})`,
            );
          }
        }
      }
    }
  }
}
