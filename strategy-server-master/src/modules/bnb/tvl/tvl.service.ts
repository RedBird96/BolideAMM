import { Injectable, Logger } from '@nestjs/common';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';
import type Web3 from 'web3';

import { PLATFORMS } from '../../../common/constants/platforms';
import { numWei } from '../../../common/utils/big-number-utils';
import type { BlockchainEntity } from '../../blockchains/blockchain.entity';
import { CONTRACT_TYPES } from '../../contracts/constants/contract-types';
import { TOKEN_NAMES } from '../../contracts/constants/token-names';
import { ContractsService } from '../../contracts/contracts.service';
import type { StrategyDto } from '../../strategies/dto/StrategyDto';
import { StrategiesService } from '../../strategies/strategies.service';
import { BnbUtilsService } from '../bnb-utils.service';
import { ERC_20 } from '../bolide/erc-20';
import { STORAGE } from '../bolide/storage';
import { FarmEthService } from '../farm/farm-eth.service';
import { UniswapApiService } from '../uniswap/uniswap-api.serivce';
import { VenusEthService } from '../venus/venus-eth.service';
import type { StrategyTvl, TvlDto } from './dto/TvlDto';
import type { TvlHistoryStrategyDataDto } from './dto/TvlHistoryStrategyDataDto';
import { TvlHistoryRepository } from './tvl-history.repository';

type TokensTvl = Record<string, { address: string; tvl: number }>;

@Injectable()
export class TvlService {
  private readonly logger = new Logger(TvlService.name);

  constructor(
    private readonly uniswapApiService: UniswapApiService,
    private readonly venusEthService: VenusEthService,
    private readonly contractsService: ContractsService,
    private readonly strategiesService: StrategiesService,
    private readonly farmEthService: FarmEthService,
    private readonly bnbUtilsService: BnbUtilsService,
    private readonly tvlHistoryRepository: TvlHistoryRepository,
    private readonly blockchainsService: BlockchainsService,
  ) {}

  async getTvlData(web3: Web3): Promise<TvlDto> {
    const strategies = await this.strategiesService.getAllStrategies();

    const { mapStrategyTvl, farmingTvl, stakingTvl } = await this.calcTvlData({
      strategies,
      web3,
    });

    let total = farmingTvl + stakingTvl;

    const strategiesTvl: StrategyTvl[] = [];

    for (const [strategy, tvlInfo] of mapStrategyTvl.entries()) {
      strategiesTvl.push({
        strategyId: strategy.id,
        type: strategy.type,
        name: strategy.name,
        totalStrategyTvl: tvlInfo.totalStrategyTvl,
        tokensTvl: tvlInfo.tokensTvl,
      });

      total += tvlInfo.totalStrategyTvl;
    }

    return {
      farmingTvl,
      stakingTvl,
      strategiesTvl,
      total,
    };
  }

  async fillTvlHistory(web3: Web3): Promise<void> {
    const date = new Date();

    const bnbBlockchain =
      await this.blockchainsService.getBnbBlockchainEntity();

    const strategies = await this.strategiesService.getAllStrategies();
    const filteredStrategies = strategies.filter(
      (strategy) => strategy.settings.isSaveTvlHistoryEnabled,
    );

    const { mapStrategyTvl, farmingTvl, stakingTvl } = await this.calcTvlData({
      strategies: filteredStrategies,
      web3,
    });

    let totalTvl = (farmingTvl || 0) + (stakingTvl || 0);

    const strategiesTvlData: TvlHistoryStrategyDataDto[] = [];

    for (const [strategy, tvlInfo] of mapStrategyTvl.entries()) {
      const storageContract = await this.contractsService.getContractById(
        strategy.storageContractId,
      );

      strategiesTvlData.push({
        strategyId: strategy.id,
        contractAddress: storageContract.address,
        totalStrategyTvl: tvlInfo.totalStrategyTvl,
        tokensTvl: tvlInfo.tokensTvl,
      });

      totalTvl += tvlInfo.totalStrategyTvl;
    }

    await this.tvlHistoryRepository.save({
      date,
      blockchainId: bnbBlockchain.id,
      farmingTvl: bnbBlockchain.settings.isSaveFarmingHistoryEnabled
        ? farmingTvl
        : null,
      stakingTvl: bnbBlockchain.settings.isSaveStakingHistoryEnabled
        ? stakingTvl
        : null,
      strategiesTvlData,
      totalTvl,
    });
  }

  private async calcTvlData(data: {
    strategies: StrategyDto[];
    web3: Web3;
  }): Promise<{
    mapStrategyTvl: Map<
      StrategyDto,
      { totalStrategyTvl: number; tokensTvl: TokensTvl }
    >;
    farmingTvl: number;
    stakingTvl: number;
  }> {
    const { strategies, web3 } = data;

    const { token1Price } = await this.uniswapApiService.getUsdtBlidPoolData();

    const blidPriceUsd = Number(token1Price);

    const bnbBlockchain =
      await this.blockchainsService.getBnbBlockchainEntity();

    const farmingTvl = await this.getTVLFromFarming({
      blidPriceUsd,
      bnbBlockchain,
      web3,
    });

    const stakingTvl = await this.getTVLFromStaking(
      blidPriceUsd,
      web3,
      bnbBlockchain,
    );

    const mapStrategyTvl = new Map<
      StrategyDto,
      { totalStrategyTvl: number; tokensTvl: TokensTvl }
    >();

    for (const strategy of strategies) {
      const { totalStrategyTvl, tokensTvl } = await this.getTVLFromStrategy(
        strategy,
        web3,
      );

      mapStrategyTvl.set(strategy, { totalStrategyTvl, tokensTvl });
    }

    return {
      mapStrategyTvl,
      farmingTvl,
      stakingTvl,
    };
  }

  async getTVLFromStrategy(
    strategy: StrategyDto,
    web3: Web3,
  ): Promise<{
    totalStrategyTvl: number;
    tokensTvl: TokensTvl;
  }> {
    try {
      const { storageContractId, logicContractId } = strategy;

      const storageContract = await this.contractsService.findOneById(
        storageContractId,
      );

      const logicContract = await this.contractsService.findOneById(
        logicContractId,
      );

      const storageContractWeb3 = new web3.eth.Contract(
        STORAGE.abi,
        storageContract.address,
      );

      const currentLockedUSD = await storageContractWeb3.methods
        .getTotalDeposit()
        .call();

      const bolideUserDeposited = numWei(currentLockedUSD);

      const totalAmountOfTokens =
        await this.venusEthService.getTotalAmountOfTokens({
          logicContract,
          web3,
        });

      const totalStrategyTvl = totalAmountOfTokens + bolideUserDeposited;

      const tokensTvl = await this.getTVLFromTokens(
        strategy,
        totalStrategyTvl,
        web3,
      );

      return {
        totalStrategyTvl,
        tokensTvl,
      };
    } catch (error) {
      this.logger.error({
        e: error,
        message: 'Error in getTVLFromStrategy',
        data: {
          strategyId: strategy?.id,
        },
      });

      return {
        totalStrategyTvl: 0,
        tokensTvl: {},
      };
    }
  }

  async getTVLFromStaking(
    blidPriceUsd: number,
    web3: Web3,
    bnbBlockchain: BlockchainEntity,
  ): Promise<number> {
    try {
      const blidTokenAddress = await this.getBlidTokenAddress(bnbBlockchain);

      const contract = new web3.eth.Contract(ERC_20.abi, blidTokenAddress);

      const masterChefAddress = await this.contractsService.getContractAddress({
        blockchainId: bnbBlockchain.id,
        platform: PLATFORMS.BOLIDE,
        type: CONTRACT_TYPES.MASTER,
      });

      const balanceOfMaster: string = await contract.methods
        .balanceOf(masterChefAddress)
        .call();

      return numWei(balanceOfMaster) * blidPriceUsd;
    } catch (error) {
      this.logger.error({
        e: error,
        message: 'Error in getTVLFromStaking',
        data: {
          blidPriceUsd,
        },
      });

      return 0;
    }
  }

  async getTVLFromFarming(data: {
    blidPriceUsd: number;
    bnbBlockchain: BlockchainEntity;
    web3: Web3;
  }): Promise<number> {
    const { blidPriceUsd, bnbBlockchain, web3 } = data;

    try {
      const blidTokenAddress = await this.getBlidTokenAddress(bnbBlockchain);
      const blidUsdtTokenAddress = await this.getBlidUsdtLpTokenAddress(
        bnbBlockchain,
      );

      const masterChefAddress = await this.contractsService.getContractAddress({
        blockchainId: bnbBlockchain.id,
        platform: PLATFORMS.BOLIDE,
        type: CONTRACT_TYPES.MASTER,
      });

      const { contract, reserve0, reserve1, totalSupply, token0, token1 } =
        await this.farmEthService.getLpContract({
          tokenAddress: blidUsdtTokenAddress,
          web3,
        });

      const lpBalanceOfMaster: string = await contract.methods
        .balanceOf(masterChefAddress)
        .call();

      let currentLockedUSD = 0;

      if (token0 === blidTokenAddress) {
        currentLockedUSD =
          (numWei(lpBalanceOfMaster) / totalSupply) *
          reserve0 *
          blidPriceUsd *
          2;
      }

      if (token1 === blidTokenAddress) {
        currentLockedUSD =
          (numWei(lpBalanceOfMaster) / totalSupply) *
          reserve1 *
          blidPriceUsd *
          2;
      }

      return currentLockedUSD;
    } catch (error) {
      this.logger.error({
        e: error,
        message: 'Error in getTVLFromFarming',
        data: {
          blidPriceUsd,
        },
      });

      return 0;
    }
  }

  async getBlidTokenAddress(bnbBlockchain: BlockchainEntity) {
    const blidToken = await this.contractsService.getTokenByName(
      bnbBlockchain.id,
      TOKEN_NAMES.BLID,
    );

    return blidToken?.address?.toLowerCase();
  }

  async getBlidUsdtLpTokenAddress(bnbBlockchain: BlockchainEntity) {
    const usdtBlidToken = await this.contractsService.getUsdtBlidLpContract(
      bnbBlockchain.id,
    );

    return usdtBlidToken?.address?.toLowerCase();
  }

  async getTVLFromTokens(
    strategy: StrategyDto,
    totalTVL: number,
    web3: Web3,
  ): Promise<Record<string, { address: string; tvl: number }>> {
    const storageContract = await this.contractsService.findOneById(
      strategy.storageContractId,
    );

    const storageContractWeb3 = new web3.eth.Contract(
      STORAGE.abi,
      storageContract.address,
    );

    const addresses = await this.contractsService.getStorageTokensAddress(
      storageContract,
    );

    const tokensTvl: Record<string, { address: string; tvl: number }> = {};
    const tokensDeposited: Record<string, { name: string; deposited: number }> =
      {};
    let totalAmountDeposited = 0;

    for (const tokenAddress of addresses) {
      const tokenDeposited = numWei(
        await storageContractWeb3.methods
          .getTokenDeposited(tokenAddress)
          .call(),
      );
      const tokenName = await this.bnbUtilsService.getTokenNameByAddress({
        address: tokenAddress,
        storageContract,
      });
      tokensDeposited[tokenAddress] = {
        name: tokenName,
        deposited: tokenDeposited,
      };
      totalAmountDeposited = totalAmountDeposited + tokenDeposited;
    }

    for (const address of addresses) {
      const { name, deposited } = tokensDeposited[address];
      tokensTvl[name] = {
        address,
        tvl: (totalTVL * deposited) / totalAmountDeposited,
      };
    }

    return tokensTvl;
  }
}
