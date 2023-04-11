import { Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import type { PLATFORMS } from 'src/common/constants/platforms';
import { WARNING_CODES } from 'src/common/constants/warning-codes';
import { LogicException } from 'src/common/logic.exception';
import { LogicWarning } from 'src/common/logic.warning';
import {
  fromWeiToNum,
  fromWeiToStr,
  safeBN,
  toBN,
} from 'src/common/utils/big-number-utils';
import type { BigNumber } from 'src/common/utils/BigNumber';
import type { BlockchainEntity } from 'src/modules/blockchains/blockchain.entity';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';
import { ERC_20 } from 'src/modules/bnb/bolide/erc-20';
import { FACTORY } from 'src/modules/bnb/uniswap/factory';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { TOKEN_NAMES } from 'src/modules/contracts/constants/token-names';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import type { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import { SwapPathsService } from 'src/modules/swap-paths/swap-paths.service';
import type Web3 from 'web3';

import { BnbUtilsService } from '../bnb-utils.service';
import { SWAP_ROUTER } from './swap-router';

type LiquidityPriceArray = Array<{ price: BigNumber; path: string[] }>;

@Injectable()
export class DexAggregatorService {
  private readonly logger = new Logger(DexAggregatorService.name);

  private factoryCache = {};

  private mapAddressName = new Map<string, string>();

  private bnbBlockchain: BlockchainEntity;

  constructor(
    private readonly bnbUtilsService: BnbUtilsService,
    private readonly blockchainsService: BlockchainsService,
    private readonly contractsService: ContractsService,
    private readonly swapPathsService: SwapPathsService,
  ) {}

  async onModuleInit() {
    this.bnbBlockchain = await this.blockchainsService.getBnbBlockchainEntity();

    const tokens = await this.contractsService.getTokens(this.bnbBlockchain.id);

    for (const token of tokens) {
      this.mapAddressName.set(token.address, token.name);
    }
  }

  async getTokensMapAddressName() {
    const tokens = await this.contractsService.getTokens(this.bnbBlockchain.id);
    const mapAddressName = new Map<string, string>();

    for (const token of tokens) {
      mapAddressName.set(token.address, token.name);
    }

    return mapAddressName;
  }

  async getPath(data: {
    platform: PLATFORMS;
    asset: string;
    assetTo: string;
  }): Promise<string[]> {
    const { platform, asset, assetTo } = data;

    const address = await this.bnbUtilsService.getTokenAddressesByName(asset);

    let path = await this.swapPathsService.getPathForTokens(
      this.bnbBlockchain.id,
      platform,
      asset,
      assetTo,
    );

    if (!path) {
      const [blidToken, busdToken] =
        await this.contractsService.getTokensByNames(this.bnbBlockchain.id, [
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

  private async getPathArr(data: {
    initialPath: string[];
  }): Promise<string[][]> {
    const { initialPath } = data;

    const promises = ['BNB', 'BUSD', 'USDT'].map((token) =>
      this.bnbUtilsService.getTokenAddressesByName(token),
    );
    const liqidPairs = await Promise.all(promises);
    let pathArr = [];

    switch (initialPath.length) {
      // берем path[1] + добаляем 3 path[2] по ликвидным BUSD, USDT, BNB
      case 2: {
        pathArr = liqidPairs.map((liquidAddress) => [
          initialPath[0],
          liquidAddress,
          initialPath[1],
        ]);
        pathArr.push(initialPath);

        return this.rmDuplicates(pathArr);
      }

      // берем path[2] + добаляем 3 path[2] по ликвидным BUSD, USDT, BNB(если какого-то нет) и еще добавляем path[1]
      case 3: {
        pathArr = liqidPairs.map((liquidAddress) => [
          initialPath[0],
          liquidAddress,
          initialPath[2],
        ]);

        if (!liqidPairs.includes(initialPath[1])) {
          pathArr.push(initialPath);
        }

        pathArr.push([initialPath[0], initialPath[2]]);

        return this.rmDuplicates(pathArr);
      }

      // берем path[3] + добавляем 3 path[3] по ликвидным BUSD, USDT, BNB(если какого-то нет) и добаляем 1 path[2] по USDT в центре
      case 4: {
        const blidAddress = await this.bnbUtilsService.getTokenAddressesByName(
          'BLID',
        );

        if (initialPath[3] === blidAddress) {
          pathArr = liqidPairs.map((liquidAddress) => [
            initialPath[0],
            liquidAddress,
            initialPath[2],
            initialPath[3],
          ]);

          if (!liqidPairs.includes(initialPath[1])) {
            pathArr.push(initialPath);
          }

          pathArr.push([initialPath[0], initialPath[2], initialPath[3]]);
        } else if (initialPath[0] === blidAddress) {
          pathArr = liqidPairs.map((liquidAddress) => [
            initialPath[0],
            initialPath[1],
            liquidAddress,
            initialPath[3],
          ]);

          if (!liqidPairs.includes(initialPath[2])) {
            pathArr.push(initialPath);
          }

          pathArr.push([initialPath[0], initialPath[1], initialPath[3]]);
        } else {
          pathArr.push(initialPath);
        }

        return this.rmDuplicates(pathArr);
      }

      default:
        pathArr.push(initialPath);

        return this.rmDuplicates(pathArr);
    }
  }

  private async getFactoryAddress({ router, address }) {
    // кешируем, чтобы сэкономить 400мс
    if (this.factoryCache[address]) {
      return this.factoryCache[address];
    }

    const factory = await router.methods.factory.call().call();
    this.factoryCache[address] = factory;

    return factory;
  }

  public async getProfitPathInternal(data: {
    platform: PLATFORMS;
    asset: string;
    assetTo: string;
    amount: BigNumber;
    web3: Web3;
    isAmountsIn?: boolean;
    isStrictLiquidity?: boolean;
  }): Promise<LiquidityPriceArray> {
    const liquidityPriceArr = [];
    const MAX_PRICE_IMPACT = toBN(20);

    const {
      platform,
      asset,
      assetTo,
      amount,
      web3,
      isAmountsIn = false,
      isStrictLiquidity = true,
    } = data;

    this.logger.debug({
      message: 'executing getProfitPathInternal',
      platform,
      asset,
      assetTo,
      amount: fromWeiToStr(amount),
      isAmountsIn,
      isStrictLiquidity,
    });

    const initialPath = await this.getPath({
      platform,
      asset,
      assetTo,
    });

    const routerContract = await this.contractsService.getContract({
      blockchainId: this.bnbBlockchain.id,
      platform,
      type: CONTRACT_TYPES.ROUTER,
    });

    const router = new web3.eth.Contract(
      SWAP_ROUTER.abi,
      routerContract.address,
    );

    const factoryAddress = await this.getFactoryAddress({
      router,
      address: routerContract.address,
    });
    const factory = new web3.eth.Contract(FACTORY.abi, factoryAddress);
    const pathArr = await this.getPathArr({ initialPath });

    const priceArr: LiquidityPriceArray = [];

    for (const path of pathArr) {
      try {
        let price: BigNumber;

        if (isAmountsIn) {
          const res = await router.methods
            .getAmountsIn(safeBN(amount), path)
            .call();
          price = toBN(res[0]);
        } else {
          const res = await router.methods
            .getAmountsOut(safeBN(amount), path)
            .call();
          price = toBN(res[res.length - 1]);
        }

        priceArr.push({ price, path });
      } catch {
        continue;
      }
    }

    if (isAmountsIn) {
      for (const priceData of priceArr) {
        let shouldSkipProfitPath = false;
        let amountToCompare = amount;

        for (const [loopIndex] of priceData.path.entries()) {
          const index = priceData.path.length - loopIndex - 1;
          const beforeIndex = index - 1;
          const path = [priceData.path[beforeIndex], priceData.path[index]];

          if (index > 0) {
            const poolAddress = await factory.methods.getPair(...path).call();
            const erc20 = new web3.eth.Contract(
              ERC_20.abi,
              priceData.path[index],
            );

            const balance = await erc20.methods.balanceOf(poolAddress).call();
            const requiredLiquidity = amountToCompare.mul(MAX_PRICE_IMPACT);

            if (requiredLiquidity.gt(toBN(balance))) {
              shouldSkipProfitPath = true;
              break;
            }

            const pairAmounts = await router.methods
              .getAmountsIn(safeBN(amountToCompare), path)
              .call();

            amountToCompare = toBN(pairAmounts[0]);
          }
        }

        if (!shouldSkipProfitPath) {
          liquidityPriceArr.push(priceData);
        }
      }
    } else {
      for (const priceData of priceArr) {
        let shouldSkipProfitPath = false;
        let amountToCompare = amount;

        for (const [index] of priceData.path.entries()) {
          const nextIndex = index + 1;
          const path = [priceData.path[index], priceData.path[nextIndex]];

          if (nextIndex < priceData.path.length) {
            const poolAddress = await factory.methods.getPair(...path).call();
            const erc20 = new web3.eth.Contract(
              ERC_20.abi,
              priceData.path[index],
            );

            const balance = await erc20.methods.balanceOf(poolAddress).call();
            const requiredLiquidity = amountToCompare.mul(MAX_PRICE_IMPACT);

            if (requiredLiquidity.gt(toBN(balance))) {
              shouldSkipProfitPath = true;
              break;
            }

            const pairAmounts = await router.methods
              .getAmountsOut(safeBN(amountToCompare), path)
              .call();

            amountToCompare = toBN(pairAmounts[1]);
          }
        }

        if (!shouldSkipProfitPath) {
          liquidityPriceArr.push(priceData);
        }
      }
    }

    const sortedArr = liquidityPriceArr.sort(
      (a, b) => b.price.toNumber() - a.price.toNumber(),
    );

    this.logger.debug({
      message: 'sorted prices after liquidity filtering',
      sortedArr: sortedArr.map(({ price, path }) => ({
        price: fromWeiToStr(price),
        path: path.map((el) => this.getName(el)),
      })),
    });

    if (sortedArr.length === 0) {
      if (isStrictLiquidity) {
        throw new LogicException(
          ERROR_CODES.NOT_EXIST_PROFITABLE_PATH({
            asset,
            assetTo,
            amount: fromWeiToNum(amount),
          }),
        );
      } else {
        this.logger.warn(
          new LogicWarning(
            WARNING_CODES.NOT_EXIST_PROFITABLE_PATH({
              asset,
              assetTo,
              amount: fromWeiToNum(amount),
            }),
          ),
        );

        return [{ path: initialPath, price: toBN(0) }];
      }
    }

    return sortedArr;
  }

  public async getProfitPath(data: {
    platform: PLATFORMS;
    asset: string;
    assetTo: string;
    amount: BigNumber;
    web3: Web3;
    isAmountsIn?: boolean;
    isStrictLiquidity?: boolean;
  }): Promise<string[]> {
    const sortedArr = await this.getProfitPathInternal(data);

    if (data.isAmountsIn) {
      return sortedArr[sortedArr.length - 1].path;
    }

    return sortedArr[0].path;
  }

  public async getProfitPathTest(data: {
    platform: PLATFORMS;
    asset: string;
    assetTo: string;
    amount: BigNumber;
    web3;
    isAmountsIn?: boolean;
    isStrictLiquidity?: boolean;
    storageContract: ContractDto;
  }): Promise<any> {
    const sortedArr = await this.getProfitPathInternal(data);

    const finalPath = data.isAmountsIn
      ? sortedArr[sortedArr.length - 1].path
      : sortedArr[0].path;

    return {
      arr: sortedArr.map(({ price, path }) => ({
        price: fromWeiToNum(price.div(toBN(10 ** 18))),
        path: path.map((el: string) => this.getName(el)),
      })),
      final: {
        tokens: finalPath.map((el: string) => this.getName(el)),
        path: finalPath,
      },
    };
  }

  private rmDuplicates(pathList: string[][]) {
    const arr = pathList.map((path) => {
      if (path[1] === path[0]) {
        return null;
      }

      if (path[2] && path[2] === path[1]) {
        return null;
      }

      if (path[3] && path[3] === path[2]) {
        return null;
      }

      return path;
    });

    return arr.filter(Boolean);
  }

  private getName(address: string): string {
    return this.mapAddressName.get(address);
  }
}
