import { Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { PLATFORMS } from 'src/common/constants/platforms';
import { LogicException } from 'src/common/logic.exception';
import {
  fromWeiToStr,
  safeBN,
  toBN,
  toWeiBN,
} from 'src/common/utils/big-number-utils';
import type { BigNumber } from 'src/common/utils/BigNumber';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { TOKEN_NAMES } from 'src/modules/contracts/constants/token-names';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import type { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import type Web3 from 'web3';
import type { ContractSendMethod } from 'web3-eth-contract';

import { BnbUtilsService } from '../bnb-utils.service';
import { BnbWeb3Service } from '../bnb-web3.service';
import { LOGIC } from '../bolide/logic';
import { TransactionsService } from '../transactions.service';
import { TradeService } from './trade-service/trade.service';
import { BSC_CHAIN_ID } from './trade-service/utils/utils';

export const SLIPPAGE = toBN(0.05);
const ADDRESS_LENGTH = 42;

@Injectable()
export class UniswapEthService {
  private readonly logger = new Logger(UniswapEthService.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly web3Service: BnbWeb3Service,
    private readonly bnbUtilsService: BnbUtilsService,
    private readonly blockchainsService: BlockchainsService,
    private readonly contractsService: ContractsService,
    private readonly tradeService: TradeService,
  ) {}

  async swap(data: {
    token1: string;
    token2: string;
    amount: BigNumber;
    platform: PLATFORMS;
    uid: string;
    isReverseSwap?: boolean;
    storageContract: ContractDto;
    logicContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }): Promise<{ tx: ContractSendMethod; meta: Record<string, unknown> }> {
    const {
      token1,
      token2,
      amount,
      platform,
      uid,
      isReverseSwap = false,
      storageContract,
      logicContract,
      web3,
      isTransactionProdMode,
    } = data;

    this.logger.debug({
      message: 'executing swap',
      token1,
      token2,
      amount: fromWeiToStr(amount),
      platform,
      uid,
      isReverseSwap,
    });

    if (token1.toUpperCase() === token2.toUpperCase()) {
      return;
    }

    const token1Name = await this.bnbUtilsService.getTokenNameByAddress({
      address: token1,
      storageContract,
    });
    const token2Name = await this.bnbUtilsService.getTokenNameByAddress({
      address: token2,
      storageContract,
    });

    const { path, inputAmount, outputAmount } =
      await this.tradeService.getProfitTrade({
        platform,
        token1Name,
        token2Name,
        amount,
        isReverseSwap,
        blockchainId: logicContract.blockchainId,
        uid,
      });

    const routerAddress = await this.getRouterAddress(platform);
    const now = Math.floor(Date.now() / 1000);
    const deadline = now + 900;

    let m;
    let method;
    let meta;

    const logicContractWeb3 = new web3.eth.Contract(
      LOGIC.abi,
      logicContract.address,
    );

    if (isReverseSwap === true) {
      const amountOut = toBN(outputAmount);
      const amountIn = toBN(inputAmount);
      const amountInMax = amountIn.add(amountIn.mul(SLIPPAGE));

      const params = {
        swap: routerAddress,
        amountOut: safeBN(amountOut),
        amountInMax: safeBN(amountInMax),
        path,
        deadline,
      };
      meta = params;
      const args = Object.values(params);

      this.logger.debug({
        message: 'calling logic contract to swap',
        params,
        isReverseSwap,
        token1Name,
        token2Name,
        uid,
      });

      if (token1Name === 'BNB') {
        this.logger.debug({ message: 'swapETHForExactTokens' });
        m = await logicContractWeb3.methods.swapETHForExactTokens(
          ...[
            routerAddress,
            safeBN(amountInMax),
            safeBN(amountOut),
            path,
            deadline,
          ],
        );
        method = 'swapETHForExactTokens';
      } else if (token2Name === 'BNB') {
        this.logger.debug({ message: 'swapTokensForExactETH' });
        m = await logicContractWeb3.methods.swapTokensForExactETH(...args);
        method = 'swapTokensForExactETH';
      } else {
        this.logger.debug({ message: 'swapTokensForExactTokens' });
        m = await logicContractWeb3.methods.swapTokensForExactTokens(...args);
        method = 'swapTokensForExactTokens';
      }
    } else {
      const amountIn = toBN(inputAmount);
      const amountOut = toBN(outputAmount);
      const amountOutMin = amountOut.sub(amountOut.mul(SLIPPAGE));

      const params = {
        swap: routerAddress,
        amount: safeBN(amountIn),
        amountOutMin: safeBN(amountOutMin),
        path,
        deadline,
      };
      meta = params;
      const args = Object.values(params);

      this.logger.debug({
        message: 'calling logic contract to swap',
        params,
        isReverseSwap,
        token1Name,
        token2Name,
        uid,
      });

      if (token1Name === 'BNB') {
        this.logger.debug({ message: 'swapExactETHForTokens' });
        m = await logicContractWeb3.methods.swapExactETHForTokens(...args);
        method = 'swapExactETHForTokens';
      } else if (token2Name === 'BNB') {
        this.logger.debug({ message: 'swapExactTokensForETH' });
        m = await logicContractWeb3.methods.swapExactTokensForETH(...args);
        method = 'swapExactTokensForETH';
      } else {
        this.logger.debug({ message: 'swapExactTokensForTokens' });
        m = await logicContractWeb3.methods.swapExactTokensForTokens(...args);
        method = 'swapExactTokensForTokens';
      }
    }

    meta.method = method;
    meta.pathData = {
      symbol: await Promise.all(
        path.map((address) =>
          this.bnbUtilsService.getTokenNameByAddress({
            address,
            isStrict: true,
            storageContract,
          }),
        ),
      ),
      sendAmount: isReverseSwap ? outputAmount : inputAmount,
      receivedAmount: isReverseSwap ? inputAmount : outputAmount,
      isReverseSwap,
    };

    await this.transactionsService.sendTransaction({
      transaction: m,
      method,
      meta,
      func: 'swap',
      uid,
      web3,
      isTransactionProdMode,
    });
  }

  async getTokenPriceUSD(data: {
    asset: string;
    platform: PLATFORMS;
    web3: Web3;
  }): Promise<BigNumber> {
    const { asset, platform, web3 } = data;

    let address = await this.bnbUtilsService.getTokenAddressesByName(asset);

    if (address === this.bnbUtilsService.ZERO_ADDRESS) {
      address = asset;
    }

    const decimals = await this.bnbUtilsService.getDecimals(address);

    const blockchainId = await this.getBlockchainId(web3);

    let localAsset = asset;

    if (localAsset.length === ADDRESS_LENGTH) {
      const token = await this.contractsService.getTokenByAddress(
        blockchainId,
        localAsset,
      );

      localAsset = token.name;
    }

    return this.getTokenConversionRate({
      asset: localAsset,
      platform,
      assetTo: TOKEN_NAMES.BUSD,
      amount: toWeiBN(1, decimals),
      web3,
    });
  }

  async getEtherPrice(web3: Web3): Promise<BigNumber> {
    return this.getTokenPriceUSD({
      asset: TOKEN_NAMES.BNB,
      platform: PLATFORMS.PANCAKESWAP,
      web3,
    });
  }

  async getTokenConversionRate(data: {
    asset: string;
    platform: PLATFORMS;
    assetTo: string;
    amount: BigNumber;
    web3: Web3;
    isAmountsIn?: boolean;
  }): Promise<BigNumber> {
    const {
      asset,
      platform,
      assetTo,
      amount,
      isAmountsIn = false,
      web3,
    } = data;

    try {
      let address = await this.bnbUtilsService.getTokenAddressesByName(asset);

      if (address === this.bnbUtilsService.ZERO_ADDRESS) {
        address = asset;
      }

      const assetToAddress = await this.bnbUtilsService.getTokenAddressesByName(
        assetTo,
      );

      if (assetToAddress.toUpperCase() === address.toUpperCase()) {
        return toWeiBN(1);
      }

      const blockchainId = await this.getBlockchainId(web3);

      if (!blockchainId) {
        throw new LogicException(ERROR_CODES.NOT_FOUND_BLOCKCHAIN);
      }

      const { pathSymbol, inputAmount, outputAmount } =
        await this.tradeService.getProfitTrade({
          platform,
          token1Name: asset,
          token2Name: assetTo,
          amount,
          isReverseSwap: isAmountsIn,
          blockchainId,
          isJustPrice: true,
        });

      const result = isAmountsIn ? toBN(inputAmount) : toBN(outputAmount);

      this.logger.debug({
        message: 'getTokenConversionRate',
        asset,
        assetTo,
        platform,
        amount: fromWeiToStr(amount),
        result: fromWeiToStr(result),
        isAmountsIn,
        path: pathSymbol,
      });

      return result;
    } catch (error) {
      this.logger.warn({
        message: 'Failed while executing getTokenConversionRate',
        asset,
        assetTo,
        platform,
        amount: fromWeiToStr(amount),
        isAmountsIn,
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

  private async getBlockchainId(web3: Web3) {
    const chainId = await web3.eth.getChainId();

    return chainId === BSC_CHAIN_ID ? 1 : null;
  }
}
