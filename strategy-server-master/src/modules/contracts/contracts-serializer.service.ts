import { Injectable } from '@nestjs/common';
import type { Farm } from 'src/modules/bnb/interfaces/farm.interface';

import { PLATFORMS } from '../../common/constants/platforms';
import { CONTRACT_TYPES } from './constants/contract-types';
import { ContractsService } from './contracts.service';
import type { LpTokenDataDto } from './dto/LpTokenDataDto';

export interface VenusTokenState {
  asset: string;
  decimals: number;
  address: string;
  vAddress: string;
}

export interface StorageTokenState {
  asset: string;
  address: string;
}

export interface DexState {
  platform: PLATFORMS;
  masterChef: string;
  router: string;
}

export interface ContractsState {
  tokenAddress: Record<string, string>;
  venusTokens: VenusTokenState[];
  dex: DexState[];
  farms: Farm[];
}

@Injectable()
export class ContractsSerializerService {
  constructor(private readonly contractsService: ContractsService) {}

  async serializeContractsToState(
    blockchainId: number,
  ): Promise<ContractsState> {
    const tokenAddress = await this.serializeTokens(blockchainId);

    const venusTokens = await this.serializeVenusTokens(blockchainId);

    const dex = await this.serializeDexContracts(blockchainId);

    const farms = await this.contractsService.getFarms(blockchainId);

    return {
      tokenAddress,
      venusTokens,
      dex,
      farms,
    };
  }

  async deserializeContractsFromState(
    blockchainId: number,
    state: ContractsState,
  ): Promise<void> {
    if (state.tokenAddress) {
      await this.deserializeTokens(blockchainId, state.tokenAddress);
    }

    if (state.venusTokens) {
      await this.deserializeVenusTokens(blockchainId, state.venusTokens);
    }

    if (state.dex) {
      await this.deserializeDexContracts(blockchainId, state.dex);
    }

    if (state.farms) {
      await this.deserializeFarms(blockchainId, state.farms);
    }
  }

  private async serializeTokens(
    blockchainId: number,
  ): Promise<Record<string, string>> {
    const tokensState: Record<string, string> = {};

    const tokens = await this.contractsService.getTokens(blockchainId);

    for (const token of tokens) {
      tokensState[token.name] = token.address;
    }

    return tokensState;
  }

  private async deserializeTokens(
    blockchainId: number,
    stateTokens: Record<string, string>,
  ): Promise<void> {
    for (const [name, address] of Object.entries(stateTokens)) {
      await this.contractsService.createOrUpdateContract({
        blockchainId,
        type: CONTRACT_TYPES.TOKEN,
        name,
        address,
      });
    }
  }

  private async serializeVenusTokens(
    blockchainId: number,
  ): Promise<VenusTokenState[]> {
    const venusState: VenusTokenState[] = [];

    const vTokens = await this.contractsService.getVenusTokens(blockchainId);

    for (const vToken of vTokens) {
      const token = await this.contractsService.getTokenByInnerToken(vToken);

      venusState.push({
        asset: token.name,
        decimals: 18,
        address: token.address,
        vAddress: vToken.address,
      });
    }

    return venusState;
  }

  private async deserializeVenusTokens(
    blockchainId: number,
    stateVenusTokens: VenusTokenState[],
  ): Promise<void> {
    for (const data of stateVenusTokens) {
      const token = await this.contractsService.getTokenByAddress(
        blockchainId,
        data.address,
      );

      await this.contractsService.createOrUpdateContract({
        blockchainId,
        type: CONTRACT_TYPES.INNER_TOKEN,
        platform: PLATFORMS.VENUS,
        name: `v${data.asset}`,
        address: data.vAddress,
        data: {
          baseContractId: token.id,
          baseContractAddress: token.address,
        },
      });
    }
  }

  private async serializeDexContracts(
    blockchainId: number,
  ): Promise<DexState[]> {
    const stateDex: DexState[] = [];

    const dexPlatforms = [
      PLATFORMS.APESWAP,
      PLATFORMS.BISWAP,
      PLATFORMS.PANCAKESWAP,
    ];

    for (const platform of dexPlatforms) {
      const masterChef = await this.contractsService.getContractAddress({
        blockchainId,
        platform,
        type: CONTRACT_TYPES.MASTER,
      });

      const router = await this.contractsService.getContractAddress({
        blockchainId,
        platform,
        type: CONTRACT_TYPES.ROUTER,
      });

      stateDex.push({
        platform,
        masterChef,
        router,
      });
    }

    return stateDex;
  }

  private async deserializeDexContracts(
    blockchainId: number,
    stateDex: DexState[],
  ): Promise<void> {
    for (const dex of stateDex) {
      const paltformName =
        dex.platform.charAt(0) + dex.platform.slice(1).toLowerCase();

      await this.contractsService.createOrUpdateContract({
        blockchainId,
        type: CONTRACT_TYPES.MASTER,
        platform: dex.platform,
        name: `${paltformName} Master`,
        address: dex.masterChef,
      });

      await this.contractsService.createOrUpdateContract({
        blockchainId,
        type: CONTRACT_TYPES.ROUTER,
        platform: dex.platform,
        name: `${paltformName} Router`,
        address: dex.router,
      });
    }
  }

  private async deserializeFarms(blockchainId: number, state: Farm[]) {
    for (const farm of state) {
      const [fromToken, toToken] = await this.contractsService.getTokensByNames(
        blockchainId,
        [farm.token1, farm.token2],
      );

      const data: LpTokenDataDto = {
        fromTokenId: fromToken.id,
        toTokenId: toToken.id,
        pid: farm.pid,
        isBorrowable: farm.isBorrowable,
      };

      await this.contractsService.createOrUpdateContract({
        blockchainId,
        type: CONTRACT_TYPES.LP_TOKEN,
        platform: farm.platform,
        address: farm.lpAddress,
        name: `${fromToken.name}-${toToken.name}`,
        data,
      });
    }
  }
}
