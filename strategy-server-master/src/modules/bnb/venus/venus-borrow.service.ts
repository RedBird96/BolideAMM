import { Injectable, Logger } from '@nestjs/common';
import { fromWei, toBN } from 'src/common/utils/big-number-utils';
import type { BigNumber } from 'src/common/utils/BigNumber';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { TOKEN_NAMES } from 'src/modules/contracts/constants/token-names';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import type { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import type Web3 from 'web3';

import { BnbUtilsService } from '../bnb-utils.service';
import { BnbWeb3Service } from '../bnb-web3.service';
import { LP_TOKEN } from '../bolide/lp-token';
import { MASTER_CHEF } from '../farm/master-chef';
import type { Farm } from '../interfaces/farm.interface';
import { TokenEthService } from '../token/token-eth.service';
import { VenusBalanceService } from './venus-balance.service';

interface FarmExtendedItem extends Farm {
  stakedAmount?: BigNumber;
  totalSupply?: BigNumber;
  token0Reserved?: BigNumber;
  token1Reserved?: BigNumber;
}

@Injectable()
export class VenusBorrowService {
  private readonly logger = new Logger(VenusBorrowService.name);

  constructor(
    private readonly web3Service: BnbWeb3Service,
    private readonly bnbUtilsService: BnbUtilsService,
    private readonly contractsService: ContractsService,
    private readonly tokenEthService: TokenEthService,
    private readonly venusBalanceService: VenusBalanceService,
  ) {}

  async getBorrowVsPairDiff(data: {
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
  }): Promise<{
    result: Record<string, BigNumber>;
    staked: Record<string, BigNumber>;
    borrowed: Record<string, BigNumber>;
    wallet: Record<string, BigNumber>;
    farming: Record<string, BigNumber>;
  }> {
    const { logicContract, storageContract, web3 } = data;

    // borrowed balance
    const venusTokens = await this.contractsService.getVenusTokens(
      storageContract.blockchainId,
    );

    const bnbToken = await this.contractsService.getTokenByName(
      storageContract.blockchainId,
      TOKEN_NAMES.BNB,
    );

    const {
      availableBalances,
      borrowBalances,
      cumulativeBalance: cumulativeVenusBalance,
    } = await this.venusBalanceService.getVenusTokensBalance({
      venusTokens,
      web3,
      bnbToken,
      logicContractAddress: logicContract.address,
    });

    const farmingTokens = await this.contractsService.getTokensByNames(
      logicContract.blockchainId,
      [TOKEN_NAMES.BLID, TOKEN_NAMES.BANANA, TOKEN_NAMES.CAKE, TOKEN_NAMES.BSW],
    );

    const farmingTokensResult =
      await this.tokenEthService.getTokensBalanceInWallet({
        tokens: farmingTokens,
        web3,
        bnbToken,
        walletAddress: logicContract.address,
      });

    let farms = await this.contractsService.getFarms(
      storageContract.blockchainId,
    );

    farms = await this.getFarmsStakedAmount({
      farms,
      web3,
      logicContract,
    });

    farms = await this.getFarmsLpTotalSupply({
      farms,
      web3,
    });

    farms = await this.getFarmsTokensReserved({
      farms,
      web3,
    });

    const { staked, cumulativeResult } = await this.calcFarmsResult({
      farms,
      cumulativeVenusBalance,
    });

    return {
      result: {
        ...cumulativeResult,
        ...farmingTokensResult,
      },
      farming: farmingTokensResult,
      staked,
      borrowed: borrowBalances,
      wallet: {
        ...availableBalances,
        ...farmingTokensResult,
      },
    };
  }

  borrowVsPairDiffResultToString(data: {
    result: Record<string, BigNumber>;
    staked: Record<string, BigNumber>;
    borrowed: Record<string, BigNumber>;
    wallet: Record<string, BigNumber>;
    farming: Record<string, BigNumber>;
  }) {
    const {
      result: resultBn,
      staked: stakedBn,
      borrowed: borrowedBn,
      wallet: walletBn,
      farming: farmingBn,
    } = data;
    const stringResults = {
      result: {},
      staked: {},
      borrowed: {},
      wallet: {},
      farming: {},
    };

    for (const key in resultBn) {
      stringResults.result[key] = resultBn[key].toString();
    }

    for (const key in stakedBn) {
      stringResults.staked[key] = stakedBn[key].toString();
    }

    for (const key in borrowedBn) {
      stringResults.borrowed[key] = borrowedBn[key].toString();
    }

    for (const key in walletBn) {
      stringResults.wallet[key] = walletBn[key].toString();
    }

    for (const key in farmingBn) {
      stringResults.farming[key] = farmingBn[key].toString();
    }

    return stringResults;
  }

  async getTokensReservesCall(data: { farm: Farm; web3: Web3 }) {
    const { farm, web3 } = data;

    const contract = new web3.eth.Contract(LP_TOKEN, farm.lpAddress);

    return contract.methods.getReserves();
  }

  async getFarmLpTotalSupplyCall(data: {
    farm: {
      lpAddress: string;
    };
    web3: Web3;
  }): Promise<any> {
    const { farm, web3 } = data;

    const contract = new web3.eth.Contract(LP_TOKEN, farm.lpAddress);

    return contract.methods.totalSupply();
  }

  async getFarmStakedAmountCall(data: {
    farm: Farm;
    logicContract: ContractDto;
    web3: Web3;
  }): Promise<any> {
    const { farm, logicContract, web3 } = data;

    const masterChefAddress = await this.contractsService.getContractAddress({
      blockchainId: logicContract.blockchainId,
      platform: farm.platform,
      type: CONTRACT_TYPES.MASTER,
    });

    const farmContract = new web3.eth.Contract(MASTER_CHEF, masterChefAddress);

    return farmContract.methods.userInfo(farm.pid, logicContract.address);
  }

  async calcFarmsResult(data: {
    farms: FarmExtendedItem[];
    cumulativeVenusBalance: Record<string, BigNumber>;
  }): Promise<{
    staked: Record<string, BigNumber>;
    cumulativeResult: Record<string, BigNumber>;
  }> {
    const { farms, cumulativeVenusBalance } = data;

    const staked = {};
    const cumulativeResult = {
      ...cumulativeVenusBalance,
    };

    for (const farm of farms) {
      const {
        stakedAmount,
        token0Reserved,
        token1Reserved,
        totalSupply,
        token1,
        token2,
        pair,
        platform,
      } = farm;

      if (stakedAmount.toNumber() === 0) {
        continue;
      }

      const userLpPart = stakedAmount.div(totalSupply);
      const userToken1Amount = token0Reserved.mul(userLpPart);
      const userToken2Amount = token1Reserved.mul(userLpPart);

      if (!cumulativeResult[token1]) {
        cumulativeResult[token1] = toBN('0');
      }

      if (!cumulativeResult[token2]) {
        cumulativeResult[token2] = toBN('0');
      }

      cumulativeResult[token1] = cumulativeResult[token1].add(userToken1Amount);

      cumulativeResult[token2] = cumulativeResult[token2].add(userToken2Amount);

      staked[`${pair}_${platform}#${token1}`] = userToken1Amount;
      staked[`${pair}_${platform}#${token2}`] = userToken2Amount;
    }

    return {
      staked,
      cumulativeResult,
    };
  }

  async getFarmsTokensReserved(data: {
    farms: Farm[];
    web3: Web3;
  }): Promise<FarmExtendedItem[]> {
    const { farms, web3 } = data;

    const calls = [];

    for (const farm of farms) {
      calls.push(
        await this.getTokensReservesCall({
          farm,
          web3,
        }),
      );
    }

    const batchResults = await this.web3Service.executeWeb3Batch(web3, calls);

    const results = [];

    for (const [i, farm] of farms.entries()) {
      const reserves = batchResults[i];

      const token0Decimals = await this.bnbUtilsService.getDecimals(
        farm.asset1Address,
      );
      const token1Decimals = await this.bnbUtilsService.getDecimals(
        farm.asset2Address,
      );

      const token0 = fromWei(toBN(reserves._reserve0), token0Decimals);
      const token1 = fromWei(toBN(reserves._reserve1), token1Decimals);

      results.push({
        ...farm,
        token0Reserved: token0,
        token1Reserved: token1,
      });
    }

    return results;
  }

  async getFarmsLpTotalSupply(data: {
    farms: Farm[];
    web3: Web3;
  }): Promise<FarmExtendedItem[]> {
    const { farms, web3 } = data;

    const calls = [];

    for (const farm of farms) {
      calls.push(
        await this.getFarmLpTotalSupplyCall({
          farm,
          web3,
        }),
      );
    }

    const batchResults = await this.web3Service.executeWeb3Batch(web3, calls);

    const results = [];

    for (const [i, farm] of farms.entries()) {
      results.push({
        ...farm,
        totalSupply: toBN(batchResults[i]),
      });
    }

    return results;
  }

  async getFarmsStakedAmount(data: {
    farms: Farm[];
    logicContract: ContractDto;
    web3: Web3;
  }): Promise<FarmExtendedItem[]> {
    const { farms, web3, logicContract } = data;
    const calls = [];

    for (const farm of farms) {
      calls.push(
        await this.getFarmStakedAmountCall({
          farm,
          web3,
          logicContract,
        }),
      );
    }

    const batchResults = await this.web3Service.executeWeb3Batch(web3, calls);

    const results = [];

    for (const [i, farm] of farms.entries()) {
      results.push({
        ...farm,
        stakedAmount: toBN(batchResults[i].amount),
      });
    }

    return results;
  }
}
