import { Injectable } from '@nestjs/common';
import { PLATFORMS } from 'src/common/constants/platforms';

import type { ContractEntity } from '../contracts/contract.entity';
import { ContractsService } from '../contracts/contracts.service';
import { SwapPathsService } from './swap-paths.service';

export type SwapPathState = Record<
  string,
  Record<string, Record<string, Array<{ name: string; address: string }>>>
>;

@Injectable()
export class SwapPathsSerializerService {
  private mapIdToken: Map<number, ContractEntity>;

  private mapNameToken: Map<string, ContractEntity>;

  constructor(
    private readonly swapPathsService: SwapPathsService,
    private readonly contractsService: ContractsService,
  ) {
    this.mapIdToken = new Map();
    this.mapNameToken = new Map();
  }

  async serializeSwapPaths(blockchainId: number): Promise<SwapPathState> {
    const state: SwapPathState = {};

    const swapPaths = await this.swapPathsService.getSwapPaths({
      blockchainId,
    });

    for (const swapPath of swapPaths) {
      const fromToken = await this.getTokenById(swapPath.fromTokenId);
      const toToken = await this.getTokenById(swapPath.toTokenId);

      const promises = swapPath.innerPath.map((id) => this.getTokenById(id));
      const innerPath = await Promise.all(promises);

      if (!state[swapPath.platform]) {
        state[swapPath.platform] = {};
      }

      if (!state[swapPath.platform][fromToken.name]) {
        state[swapPath.platform][fromToken.name] = {};
      }

      state[swapPath.platform][fromToken.name][toToken.name] = [
        { name: fromToken.name, address: fromToken.address },
        ...innerPath.map((item) => ({
          name: item.name,
          address: item.address,
        })),
        { name: toToken.name, address: toToken.address },
      ];
    }

    return state;
  }

  async deserializeSwapPaths(
    blockchainId: number,
    data: SwapPathState,
  ): Promise<void> {
    for (const [platformName, paltformPathes] of Object.entries(data)) {
      const platform: PLATFORMS = PLATFORMS[platformName];

      if (!platform) {
        continue;
      }

      for (const [fromTokenName, fromTokenPathes] of Object.entries(
        paltformPathes,
      )) {
        for (const [toTokenName, statePath] of Object.entries(
          fromTokenPathes,
        )) {
          const tokens = await Promise.all(
            statePath.map((token) =>
              this.getTokenByName(blockchainId, token.name),
            ),
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

          const innerPath = tokens.slice(1, -1).map((token) => token.id);

          const dbPath = await this.swapPathsService.getPathForTokens(
            blockchainId,
            platform,
            fromToken.name,
            toToken.name,
          );

          if (!dbPath) {
            await this.swapPathsService.createSwapPath({
              blockchainId,
              platform,
              fromTokenId: tokens[0].id,
              toTokenId: tokens[tokens.length - 1].id,
              innerPath,
            });
          } else {
            if (
              dbPath.every((address, i) => statePath[i].address === address)
            ) {
              continue;
            }

            const swapPaths = await this.swapPathsService.getSwapPaths({
              blockchainId,
              platform,
              fromTokenId: tokens[0].id,
              toTokenId: tokens[tokens.length - 1].id,
            });

            if (swapPaths.length !== 1) {
              throw new Error(
                `Exactly one swap path for tokens should be declared: ${fromToken.name}-${toToken.name}`,
              );
            }

            await this.swapPathsService.updateSwapPathById(swapPaths[0].id, {
              innerPath,
            });
          }
        }
      }
    }
  }

  private async getTokenById(id: number): Promise<ContractEntity> {
    if (!this.mapIdToken.has(id)) {
      const token = await this.contractsService.getContractById(id);
      this.mapIdToken.set(id, token);
      this.mapNameToken.set(token.name, token);
    }

    return this.mapIdToken.get(id);
  }

  private async getTokenByName(
    blockchainId: number,
    name: string,
  ): Promise<ContractEntity> {
    if (!this.mapNameToken.has(name)) {
      const token = await this.contractsService.getTokenByName(
        blockchainId,
        name,
      );
      this.mapIdToken.set(token.id, token);
      this.mapNameToken.set(token.name, token);
    }

    return this.mapNameToken.get(name);
  }
}
