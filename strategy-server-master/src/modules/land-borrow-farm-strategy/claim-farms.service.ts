import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { PLATFORMS } from 'src/common/constants/platforms';
import {
  fromWei,
  fromWeiToStr,
  safeBN,
  toBN,
} from 'src/common/utils/big-number-utils';
import { BigNumber } from 'src/common/utils/BigNumber';
import { MulticallSendService } from 'src/modules/bnb/multicall/multicall-send.service';
import type Web3 from 'web3';
import type { Contract, ContractSendMethod } from 'web3-eth-contract';

import { BnbUtilsService } from '../bnb/bnb-utils.service';
import { LOGIC } from '../bnb/bolide/logic';
import { StakedAmountService } from '../bnb/farm/staked-amount.service';
import { SwapEarnService } from '../bnb/farm/swap-earn.service';
import { TokenEthService } from '../bnb/token/token-eth.service';
import { TransactionsService } from '../bnb/transactions.service';
import { TradeService } from '../bnb/uniswap/trade-service/trade.service';
import { UniswapEthService } from '../bnb/uniswap/uniswap-eth.service';
import { UniswapTokenPriceService } from '../bnb/uniswap/uniswap-token-price.service';
import { CONTRACT_TYPES } from '../contracts/constants/contract-types';
import { TOKEN_NAMES } from '../contracts/constants/token-names';
import { ContractsService } from '../contracts/contracts.service';
import type { ContractDto } from '../contracts/dto/ContractDto';
import { StrategiesService } from '../strategies/strategies.service';
import type { LandBorrowFarmSettingsDto } from './dto/LandBorrowFarmSettingsDto';

export const SLIPPAGE = toBN(0.05);

@Injectable()
export class ClaimFarmsService {
  private readonly logger = new Logger(ClaimFarmsService.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly uniswapEthService: UniswapEthService,
    private readonly tokenEthService: TokenEthService,
    @Inject(forwardRef(() => StrategiesService))
    private readonly strategiesService: StrategiesService,
    private readonly contractsService: ContractsService,
    private readonly stakedAmountService: StakedAmountService,
    private readonly swapEarnService: SwapEarnService,
    private readonly uniswapTokenPriceService: UniswapTokenPriceService,
    private readonly tradeService: TradeService,
    private readonly bnbUtilsService: BnbUtilsService,
    private readonly multicallSendSerivce: MulticallSendService,
  ) {}

  async claimFarmsRewards(data: {
    uid: string;
    logicContract: ContractDto;
    storageContract: ContractDto;
    strategyId: number;
    web3: Web3;
  }) {
    const { uid, logicContract, storageContract, web3, strategyId } = data;

    this.logger.debug({
      message: 'executing claimFarmsRewards',
      uid,
      strategyId,
      logicContract: logicContract.address,
      storageContract: storageContract.address,
    });

    const strategy = await this.strategiesService.getStrategyById(strategyId);

    const settings = strategy.settings as LandBorrowFarmSettingsDto;

    const { claimMinUsd, isTransactionProdMode } = settings;

    const logicContractWeb3 = new web3.eth.Contract(
      LOGIC.abi,
      logicContract.address,
    );

    const [baseToken, bnbToken, cakeToken, bananaToken, bswToken] =
      await this.contractsService.getTokensByNames(logicContract.blockchainId, [
        TOKEN_NAMES.BLID,
        TOKEN_NAMES.BNB,
        TOKEN_NAMES.CAKE,
        TOKEN_NAMES.BANANA,
        TOKEN_NAMES.BSW,
      ]);

    // farms bonuses
    let earnedAmount = toBN(0);

    const farmsWithStakedAmount =
      await this.stakedAmountService.getFarmsStakedAmount({
        logicContract,
        web3,
      });

    const farmsWithSwapEarn = await this.swapEarnService.calcSwapEarns({
      farms: farmsWithStakedAmount,
      logicContract,
      storageContract,
      web3,
    });

    const earnsWithAmountBUSD =
      await this.uniswapTokenPriceService.getStakedEarnsAmountInBUSD({
        farmsWithSwapEarn,
        web3,
        storageContract,
      });

    for (const key in earnsWithAmountBUSD) {
      const item = earnsWithAmountBUSD[key];

      this.logger.debug(
        `Earns for ${item.pair} ${item.farmName}
          amount: ${item.amount.toNumber()}
          amountBUSD ${item.amountBUSD.toNumber()}`,
      );
    }

    const claimSwapTransactions = [];

    for (const key in earnsWithAmountBUSD) {
      const farm = earnsWithAmountBUSD[key];

      if (earnsWithAmountBUSD[key].amountBUSD.gt(toBN(claimMinUsd))) {
        claimSwapTransactions.push(
          await this.createClaimSwapTransaction({
            farm,
            uid,
            logicContractWeb3,
            blockchainId: logicContract.blockchainId,
          }),
        );
      }
    }

    await this.multicallSendSerivce.sendMulticall({
      txArr: claimSwapTransactions,
      contract: logicContract,
      method: 'claimSwap',
      isTransactionProdMode,
      web3,
      uid,
    });

    const availableBalances =
      await this.tokenEthService.getTokensBalanceInWallet({
        tokens: [bnbToken, cakeToken, bswToken, bananaToken],
        web3,
        bnbToken,
        walletAddress: logicContract.address,
        isBalanceInWei: true,
      });

    const availableReservedBNB = availableBalances[bnbToken.name] || toBN('0');
    const pancakeRewards = availableBalances[cakeToken.name] || toBN('0');
    const biswapRewards = availableBalances[bswToken.name] || toBN('0');
    const apeRewards = availableBalances[bananaToken.name] || toBN('0');

    this.logger.debug(`
      availableReservedBNB: ${fromWei(availableReservedBNB).toString()},
      pancakeRewards: ${fromWei(pancakeRewards).toString()},
      biswapRewards: ${fromWei(biswapRewards).toString()},
      apeRewards: ${fromWei(apeRewards).toString()},
    `);

    const swapTransactions = [];

    if (pancakeRewards.gt(toBN(0))) {
      swapTransactions.push(
        await this.createSwapTransaction({
          token1Name: cakeToken.name,
          token2Name: bnbToken.name,
          amount: pancakeRewards,
          platform: PLATFORMS.PANCAKESWAP,
          uid,
          storageContract,
          logicContract,
          web3,
        }),
      );
    }

    if (apeRewards.gt(toBN(0))) {
      swapTransactions.push(
        await this.createSwapTransaction({
          token1Name: bananaToken.name,
          token2Name: bnbToken.name,
          amount: apeRewards,
          platform: PLATFORMS.APESWAP,
          uid,
          storageContract,
          logicContract,
          web3,
        }),
      );
    }

    if (biswapRewards.gt(toBN(0))) {
      swapTransactions.push(
        await this.createSwapTransaction({
          token1Name: bswToken.name,
          token2Name: bnbToken.name,
          amount: biswapRewards,
          platform: PLATFORMS.BISWAP,
          uid,
          storageContract,
          logicContract,
          web3,
        }),
      );
    }

    await this.multicallSendSerivce.sendMulticall({
      txArr: swapTransactions,
      contract: logicContract,
      method: 'swap',
      isTransactionProdMode,
      web3,
      uid,
    });

    const totalBNBAmount = await this.tokenEthService.getTokensBalanceInWallet({
      tokens: [bnbToken],
      web3,
      bnbToken,
      walletAddress: logicContract.address,
      isBalanceInWei: true,
    });

    const totalBNB = totalBNBAmount[bnbToken.name];

    const profitBNB = BigNumber.max(
      totalBNB.sub(availableReservedBNB),
      toBN(0),
    );

    this.logger.debug({
      message: 'swap profit BNB to BLID',
      profitBNB: fromWeiToStr(profitBNB),
      totalBNB: fromWeiToStr(totalBNB),
      availableReservedBNB: fromWeiToStr(availableReservedBNB),
    });

    if (profitBNB.gt(toBN(0))) {
      const { tx, meta } = await this.createSwapTransaction({
        token1Name: bnbToken.name,
        token2Name: baseToken.name,
        amount: profitBNB,
        platform: PLATFORMS.PANCAKESWAP,
        uid,
        storageContract,
        logicContract,
        web3,
      });

      await this.transactionsService.sendTransaction({
        transaction: tx,
        method: 'claimFarmsRewards',
        meta,
        func: 'swap',
        uid,
        web3,
        isTransactionProdMode,
      });

      earnedAmount = earnedAmount.add(
        await this.uniswapEthService.getTokenConversionRate({
          asset: bnbToken.name,
          platform: PLATFORMS.PANCAKESWAP,
          assetTo: baseToken.name,
          amount: profitBNB,
          web3,
        }),
      );
    }

    this.logger.debug({
      message: 'claimFarmsRewards result',
      earnedAmount: fromWeiToStr(earnedAmount),
    });

    return earnedAmount;
  }

  async createClaimSwapTransaction(data: {
    uid: string;
    farm: {
      platform: PLATFORMS;
      pid: number;
    };
    logicContractWeb3: Contract;
    blockchainId: number;
  }): Promise<{ tx: ContractSendMethod; meta: Record<string, unknown> }> {
    const { farm, uid, logicContractWeb3, blockchainId } = data;

    this.logger.debug({
      message: 'executing claimSwap',
      farm,
      uid,
    });

    const macterChef = await this.contractsService.getContract({
      blockchainId,
      platform: farm.platform,
      type: CONTRACT_TYPES.MASTER,
    });

    const meta = {
      swapMaster: macterChef.address,
      pid: farm.pid,
      amount: toBN(0).toString(),
    };

    this.logger.debug({
      message: 'createClaimSwapTransaction',
      swapMaster: macterChef.address,
      pid: farm.pid,
      amount: toBN(0).toString(),
      meta,
    });

    const tx = logicContractWeb3.methods.deposit(
      macterChef.address,
      farm.pid,
      '0',
    );

    return { tx, meta };
  }

  async createSwapTransaction(data: {
    token1Name: string;
    token2Name: string;
    amount: BigNumber;
    platform: PLATFORMS;
    uid: string;
    storageContract: ContractDto;
    logicContract: ContractDto;
    web3: Web3;
  }): Promise<{ tx: ContractSendMethod; meta: Record<string, unknown> }> {
    const {
      token1Name,
      token2Name,
      amount,
      platform,
      uid,
      storageContract,
      logicContract,
      web3,
    } = data;

    this.logger.debug({
      message: 'executing swap',
      token1Name,
      token2Name,
      amount: fromWeiToStr(amount),
      platform,
      uid,
    });

    if (token1Name.toUpperCase() === token2Name.toUpperCase()) {
      return;
    }

    const { path, inputAmount, outputAmount } =
      await this.tradeService.getProfitTrade({
        platform,
        token1Name,
        token2Name,
        amount,
        blockchainId: logicContract.blockchainId,
        uid,
      });

    const routerAddress = await this.contractsService.getContract({
      blockchainId: logicContract.blockchainId,
      platform,
      type: CONTRACT_TYPES.ROUTER,
    });

    const now = Math.floor(Date.now() / 1000);
    const deadline = now + 900;

    let transaction;
    let method;
    let meta = {};

    const logicContractWeb3 = new web3.eth.Contract(
      LOGIC.abi,
      logicContract.address,
    );
    const amountIn = toBN(inputAmount);
    const amountOut = toBN(outputAmount);
    const amountOutMin = amountOut.sub(amountOut.mul(SLIPPAGE));

    const params = {
      swap: routerAddress.address,
      amount: safeBN(amountIn),
      amountOutMin: safeBN(amountOutMin),
      path,
      deadline,
    };

    const args = Object.values(params);

    if (token1Name === 'BNB') {
      transaction = await logicContractWeb3.methods.swapExactETHForTokens(
        ...args,
      );
      method = 'swapExactETHForTokens';
    } else if (token2Name === 'BNB') {
      transaction = await logicContractWeb3.methods.swapExactTokensForETH(
        ...args,
      );
      method = 'swapExactTokensForETH';
    } else {
      transaction = await logicContractWeb3.methods.swapExactTokensForTokens(
        ...args,
      );
      method = 'swapExactTokensForTokens';
    }

    meta = {
      pathData: {
        symbol: await Promise.all(
          path.map((address) =>
            this.bnbUtilsService.getTokenNameByAddress({
              address,
              isStrict: true,
              storageContract,
            }),
          ),
        ),
        sendAmount: inputAmount,
        receivedAmount: outputAmount,
      },
      ...params,
    };

    this.logger.debug({
      message: 'createSwapTransaction',
      method,
      meta,
    });

    return { tx: transaction, meta };
  }
}
