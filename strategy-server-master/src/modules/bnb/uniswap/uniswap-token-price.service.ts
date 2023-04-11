import { Injectable, Logger } from '@nestjs/common';
import { PLATFORMS } from 'src/common/constants/platforms';
import {
  fromWei,
  safeBN,
  toBN,
  toWeiBN,
} from 'src/common/utils/big-number-utils';
import { BigNumber } from 'src/common/utils/BigNumber';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { TOKEN_NAMES } from 'src/modules/contracts/constants/token-names';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import type { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import { SwapPathsService } from 'src/modules/swap-paths/swap-paths.service';
import type Web3 from 'web3';
import type { Contract } from 'web3-eth-contract';

import { BnbUtilsService } from '../bnb-utils.service';
import { BnbWeb3Service } from '../bnb-web3.service';
import { SWAP_ROUTER } from './swap-router';

interface TokenRateItem {
  asset: string;
  platform: PLATFORMS;
}

interface TokenWithAdditionalData extends TokenRateItem {
  decimals: number;
  address: string;
  assetToAddress: string;
  assetTo: TOKEN_NAMES;
  amount: BigNumber;
  routerAddress: string;
  routerContract: Contract;
  isAmountsIn?: boolean;
}

interface TokenWithPath extends TokenWithAdditionalData {
  path: string[];
}

interface TokenWithRate extends TokenWithPath {
  rate: BigNumber;
}

interface StakedItems {
  farmName: string;
  platform: PLATFORMS;
  pair: string;
  pid: number;
  amount: BigNumber;
}

interface StakedItemsWithAmountBusd extends StakedItems {
  amountBUSD: BigNumber;
}

export interface TokenWithRateWeiAndAmount extends TokenWithRate {
  rateWei: BigNumber;
  amountBUSD: BigNumber;
}

@Injectable()
export class UniswapTokenPriceService {
  private readonly logger = new Logger(UniswapTokenPriceService.name);

  constructor(
    private readonly bnbUtilsService: BnbUtilsService,
    private readonly web3Service: BnbWeb3Service,
    private readonly blockchainsService: BlockchainsService,
    private readonly contractsService: ContractsService,
    private readonly swapPathsService: SwapPathsService,
  ) {}

  // key format is BNB-LINK_PANCAKESWAP#BNB
  async getStakedAmoundAndStakedPriceBusd(data: {
    stakedItems: Record<string, BigNumber>;
    web3: Web3;
    platform?: PLATFORMS;
  }): Promise<{
    staked: Record<string, BigNumber>;
    stakedAmount: BigNumber;
  }> {
    const { stakedItems, web3, platform = PLATFORMS.PANCAKESWAP } = data;
    const keys = []; // BNB-LINK_PANCAKESWAP#BNB
    const tokens = []; // { asset: BNB, platform: PANCEKESWAP }

    for (const stakedKey in stakedItems) {
      keys.push(stakedKey);

      tokens.push({
        asset: `${stakedKey.split('#')[1]}`,
        platform,
      });
    }

    const tokensWithRate = await this.getTokensRateBUSD({ web3, tokens });

    const staked = {};

    let stakedAmount = toBN('0');

    for (const [i, token] of tokens.entries()) {
      const assetKey = token.asset; // BNB, LINK, etc...
      const rate = fromWei(tokensWithRate[assetKey].rate);
      const stakedKey = keys[i];
      const value = stakedItems[stakedKey];

      const price = rate.mul(value);

      staked[stakedKey] = price;

      stakedAmount = stakedAmount.add(price);
    }

    return {
      staked,
      stakedAmount,
    };
  }

  async getStakedEarnsAmountInBUSD(data: {
    farmsWithSwapEarn: Record<string, StakedItems>;
    web3: Web3;
    storageContract: ContractDto;
  }): Promise<Record<string, StakedItemsWithAmountBusd>> {
    const { storageContract, farmsWithSwapEarn: stakedItems, web3 } = data;

    const mapFarmPlatformsTokens =
      await this.contractsService.getFarmPlatformsTokens(
        storageContract.blockchainId,
      );

    // { CAKE: PANCAKESWAP }
    const platformsBaseTokens: Record<string, PLATFORMS> = {};
    const tokens: TokenRateItem[] = [];

    for (const [platform, assetContract] of mapFarmPlatformsTokens.entries()) {
      const { name: asset } = assetContract;

      platformsBaseTokens[asset] = platform;

      tokens.push({
        asset,
        platform,
      });
    }

    const tokensWithRate = await this.getTokensRateBUSD({ tokens, web3 });

    const results: Record<string, StakedItemsWithAmountBusd> = {};

    for (const key in stakedItems) {
      const stakedItem = stakedItems[key];
      const { platform, amount } = stakedItem;

      const assetContract = mapFarmPlatformsTokens.get(platform);
      const { name: asset } = assetContract;

      const rateItem = tokensWithRate[asset];

      const amountBUSD = fromWei(rateItem.rate).mul(amount);

      results[key] = {
        ...stakedItem,
        amountBUSD,
      };
    }

    return results;
  }

  async getTokensRateWeiAndAmountBusd(data: {
    items: Record<string, BigNumber>;
    web3: Web3;
  }): Promise<Record<string, TokenWithRateWeiAndAmount>> {
    const { items, web3 } = data;
    const tokens: TokenRateItem[] = [];

    for (const key in items) {
      if (items[key].toNumber() !== 0) {
        tokens.push({
          asset: key,
          platform: PLATFORMS.PANCAKESWAP,
        });
      }
    }

    const tokensWithRate = await this.getTokensRateBUSD({ tokens, web3 });

    const results = {};

    for (const key in tokensWithRate) {
      if (tokensWithRate[key]) {
        const rateWei = fromWei(tokensWithRate[key].rate);
        const amountBUSD = rateWei.mul(items[key]);

        results[key] = {
          ...tokensWithRate[key],
          rateWei,
          amountBUSD,
        };
      }
    }

    return results;
  }

  async getTokensRateBUSD(data: {
    web3: Web3;
    tokens: TokenRateItem[];
  }): Promise<Record<string, TokenWithRate>> {
    const { tokens, web3 } = data;

    const extTokenDataResults: TokenWithPath[] = [];

    for (const token of tokens) {
      const tokensWithAddData = await this.getTokenDataAndCalcAmount({
        token,
        web3,
      });

      let path = [];

      path =
        tokensWithAddData.asset !== tokensWithAddData.assetTo
          ? await this.getPath({
              asset: tokensWithAddData.asset,
              platform: token.platform,
              assetTo: tokensWithAddData.assetTo,
              amount: tokensWithAddData.amount,
              address: tokensWithAddData.address,
            })
          : [];

      extTokenDataResults.push({ ...tokensWithAddData, path });
    }

    return this.getTokensConversionRate({ tokens: extTokenDataResults, web3 });
  }

  async getTokenDataAndCalcAmount(data: {
    token: TokenRateItem;
    web3: Web3;
  }): Promise<TokenWithAdditionalData> {
    const { token, web3 } = data;
    const { asset, platform } = token;

    let address = await this.bnbUtilsService.getTokenAddressesByName(asset);

    const assetToAddress = await this.bnbUtilsService.getTokenAddressesByName(
      TOKEN_NAMES.BUSD,
    );

    if (address === this.bnbUtilsService.ZERO_ADDRESS) {
      address = asset;
    }

    const decimals = await this.bnbUtilsService.getDecimals(address);

    const routerAddress = await this.getRouterAddress(platform);

    const routerContract = new web3.eth.Contract(
      SWAP_ROUTER.abi,
      routerAddress,
    );

    return {
      ...token,
      decimals,
      assetToAddress,
      assetTo: TOKEN_NAMES.BUSD,
      amount: toWeiBN(1, decimals),
      routerAddress,
      routerContract,
      address,
    };
  }

  async getPath(data: {
    asset: string;
    address: string;
    platform: PLATFORMS;
    assetTo: string;
    amount: BigNumber;
  }): Promise<string[]> {
    const { address, asset, platform, assetTo } = data;

    const bnbBlockchain =
      await this.blockchainsService.getBnbBlockchainEntity();

    let path = await this.swapPathsService.getPathForTokens(
      bnbBlockchain.id,
      platform,
      asset,
      assetTo,
    );

    if (!path) {
      const [blidToken, busdToken] =
        await this.contractsService.getTokensByNames(bnbBlockchain.id, [
          TOKEN_NAMES.BLID,
          TOKEN_NAMES.BUSD,
        ]);

      const assetToAddress = await this.bnbUtilsService.getTokenAddressesByName(
        assetTo,
      );

      path =
        assetTo.toUpperCase() === blidToken.address.toUpperCase() ||
        assetTo.toUpperCase() === 'BLID'
          ? [address, busdToken.address, assetToAddress]
          : [address, assetToAddress];
    }

    return path;
  }

  async getTokensConversionRate(data: {
    tokens: TokenWithPath[];
    web3: Web3;
  }): Promise<Record<string, TokenWithRate>> {
    const { tokens, web3 } = data;

    const calls = [];
    const results = {};

    for (const token of tokens) {
      const {
        amount,
        isAmountsIn = false,
        path = [],
        routerContract,
        address,
        assetToAddress,
      } = token;

      if (address !== assetToAddress) {
        const call = isAmountsIn
          ? routerContract.methods.getAmountsIn(safeBN(amount), path)
          : routerContract.methods.getAmountsOut(safeBN(amount), path);

        calls.push(call);
      } else {
        // что бы сохранить кол-во элементов в массиве ответов
        calls.push(null);
      }
    }

    try {
      const callsResult = await this.web3Service.executeWeb3Batch(web3, calls);

      for (const [i, token] of tokens.entries()) {
        let rate = new BigNumber(0);

        if (token.address !== token.assetToAddress) {
          rate = token.isAmountsIn
            ? toBN(callsResult[i][0])
            : toBN(callsResult[i][callsResult[i].length - 1]);
        } else {
          rate = new BigNumber(1e18);
        }

        results[token.asset] = {
          ...token,
          rate,
        };
      }

      return results;
    } catch (error) {
      this.logger.warn({
        message: 'Failed while executing getTokensConversionRate',
      });

      throw error;
    }
  }

  private async getRouterAddress(platform: PLATFORMS): Promise<string> {
    if (!platform) {
      throw new Error('Platform argument is undefined');
    }

    const bnbBlockchain =
      await this.blockchainsService.getBnbBlockchainEntity();

    const contract = await this.contractsService.getContract({
      blockchainId: bnbBlockchain.id,
      platform,
      type: CONTRACT_TYPES.ROUTER,
    });

    return contract.address;
  }
}
