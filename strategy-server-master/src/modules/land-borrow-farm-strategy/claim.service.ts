import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import Decimal from 'decimal.js';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { PLATFORMS } from 'src/common/constants/platforms';
import { TG_MESSAGES } from 'src/common/constants/tg-messages';
import { LogicException } from 'src/common/logic.exception';
import {
  fromWeiToNum,
  fromWeiToStr,
  MILLION,
  safeBN,
  toBN,
  toWeiBN,
} from 'src/common/utils/big-number-utils';
import { BigNumber } from 'src/common/utils/BigNumber';
import type Web3 from 'web3';

import { BalanceService } from '../bnb/balance.service';
import { BnbWeb3Service } from '../bnb/bnb-web3.service';
import { ERC_20 } from '../bnb/bolide/erc-20';
import { LOGIC } from '../bnb/bolide/logic';
import { TokenEthService } from '../bnb/token/token-eth.service';
import { TransactionsService } from '../bnb/transactions.service';
import { UniswapEthService } from '../bnb/uniswap/uniswap-eth.service';
import { TOKEN_NAMES } from '../contracts/constants/token-names';
import { ContractsService } from '../contracts/contracts.service';
import type { ContractDto } from '../contracts/dto/ContractDto';
import { OPERATION_STATUS } from '../operations/operation.entity';
import { OperationsService } from '../operations/operations.service';
import { StrategiesService } from '../strategies/strategies.service';
import { TelegramService } from '../telegram/telegram.service';
import { LbfAnalyticsService } from './analytics/lbf-analytics.service';
import { BolidLibService } from './bolide-lib.service';
import { BoostingService } from './boosting.service';
import { ClaimFarmsService } from './claim-farms.service';
import { ClaimVenusService } from './claim-venus.service';
import type { LandBorrowFarmSettingsDto } from './dto/LandBorrowFarmSettingsDto';
import type { WithTransactionsRespDto } from './dto/WithTransactionsRespDto';

@Injectable()
export class ClaimService {
  private readonly logger = new Logger(ClaimService.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    @Inject(forwardRef(() => BolidLibService))
    private readonly bolidLibService: BolidLibService,
    private readonly operationService: OperationsService,
    private readonly balanceService: BalanceService,
    private readonly telegramService: TelegramService,
    private readonly uniswapEthService: UniswapEthService,
    private readonly tokenEthService: TokenEthService,
    @Inject(forwardRef(() => StrategiesService))
    private readonly strategiesService: StrategiesService,
    private readonly contractsService: ContractsService,
    private readonly boostingService: BoostingService,
    private readonly bnbWeb3Service: BnbWeb3Service,
    @Inject(forwardRef(() => LbfAnalyticsService))
    private readonly lbfAnalyticsService: LbfAnalyticsService,
    private readonly claimFarmsService: ClaimFarmsService,
    private readonly claimVenusService: ClaimVenusService,
  ) {}

  calcBoostingAmountValue(amount: number): string {
    const value: string = safeBN(toBN(amount).mul(toBN(10).pow(toBN(18))));

    this.logger.debug({
      message: 'calcBoostingAmountValue',
      value,
    });

    return value;
  }

  async sendBoostingTokens(data: {
    amount: number;
    uid: string;
    logicContract: ContractDto;
    fromAddress: string;
    adminWeb3: Web3;
    boostingWeb3: Web3;
    isTransactionProdMode: boolean;
  }): Promise<void> {
    const {
      amount,
      uid,
      logicContract,
      adminWeb3,
      boostingWeb3,
      fromAddress,
      isTransactionProdMode,
    } = data;

    const blidToken = await this.contractsService.getTokenByName(
      logicContract.blockchainId,
      TOKEN_NAMES.BLID,
    );

    const blidContractWeb3 = new adminWeb3.eth.Contract(
      ERC_20.abi,
      blidToken.address,
    );

    const spender = adminWeb3.eth.defaultAccount;

    const isAllowed = await this.tokenEthService.checkAllowance({
      token: blidToken.address,
      owner: fromAddress,
      spender,
      web3: adminWeb3,
    });

    if (!isAllowed) {
      // TODO: после того, как approve будет делаться при деплое смарт контракта
      // этот вызов нужно удалить и разкомментировать throw
      await this.tokenEthService.approve({
        owner: fromAddress,
        spender,
        token: blidToken.address,
        amount: MILLION.mul(toBN(10)),
        uid,
        web3: boostingWeb3,
        isTransactionProdMode,
      });

      // throw new LogicException(
      //   ERROR_CODES.NOT_ENOUGH_ALLOWANCE({
      //     owner: fromAddress,
      //     spender,
      //   }),
      // );
    }

    const transaction = blidContractWeb3.methods.transferFrom(
      fromAddress,
      logicContract.address,
      this.calcBoostingAmountValue(amount),
    );

    await this.transactionsService.sendTransaction({
      uid,
      transaction,
      method: 'transferFrom',
      func: 'sendBoostingTokens',
      doesReceiptLogsHaveErrors: (receipt) =>
        !receipt.logs || receipt.logs.length === 0,
      web3: adminWeb3,
      isTransactionProdMode,
    });
  }

  async makeStrategyBoosting(data: {
    uid: string;
    lastClaimBlockNumber: number;
    strategyId: number;
  }) {
    const { uid, lastClaimBlockNumber, strategyId } = data;

    const strategy = await this.strategiesService.getStrategyById(strategyId);

    if (!strategy) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY);
    }

    const settings = strategy.settings as LandBorrowFarmSettingsDto;

    const { quantityTokensInBlock, isTransactionProdMode } = settings;

    if (quantityTokensInBlock && quantityTokensInBlock > 0) {
      const { operationsPrivateKeyId, logicContractId } = strategy;

      const logicContract = await this.contractsService.getContractById(
        logicContractId,
      );

      const { web3: adminWeb3 } =
        await this.bnbWeb3Service.createWeb3AndAccount(operationsPrivateKeyId);

      const quantityTokensInBlockDecimal = new Decimal(quantityTokensInBlock);

      const currentBlock: number = await adminWeb3.eth.getBlockNumber();

      let lastTxBlockNumber = currentBlock;

      if (lastClaimBlockNumber) {
        lastTxBlockNumber = lastClaimBlockNumber;
      }

      const blocksDiff = currentBlock - lastTxBlockNumber;
      const tokensAmount = new Decimal(blocksDiff).mul(
        quantityTokensInBlockDecimal,
      );
      const tokensAmountNumber = tokensAmount.toNumber();

      this.logger.debug({
        message: 'makeStrategyBoosting data',
        tokensAmount,
        uid,
        blocksDiff,
        currentBlock,
        lastTxBlockNumber,
      });

      const { web3: boostingWeb3, web3Account: boostingAccount } =
        await this.boostingService.getBoostingWeb3AndAccount(strategyId);

      const boostingWalletAddress = boostingAccount.address;

      const boostingWalletBalance = await this.balanceService.getWalletBalances(
        {
          address: boostingWalletAddress,
          web3: boostingWeb3,
        },
      );

      const { blidBalance } = boostingWalletBalance;

      this.logger.debug({
        message: 'makeStrategyBoosting wallet data',
        boostingWalletAddress,
        blidBalance,
      });

      if (tokensAmountNumber > 0) {
        await (new Decimal(blidBalance).gte(tokensAmount)
          ? this.sendBoostingTokens({
              amount: tokensAmountNumber,
              uid,
              logicContract,
              adminWeb3,
              boostingWeb3,
              fromAddress: boostingWalletAddress,
              isTransactionProdMode,
            })
          : this.telegramService.sendMessageToGroup(
              TG_MESSAGES.BOOSTING_BLID_BALANCE_TO_LOW({
                boostingBalance: new Decimal(blidBalance).toNumber(),
                needBalance: tokensAmountNumber,
                boostingWalletAddress,
              }),
            ));
      }
    }
  }

  async claimRewards(data: {
    isClaimVenus: boolean;
    isClaimFarms: boolean;
    isClaimLended: boolean;
    uid: string;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
    strategyId: number;
    isTransactionProdMode: boolean;
  }): Promise<BigNumber> {
    const {
      isClaimVenus,
      isClaimFarms,
      isClaimLended,
      uid,
      logicContract,
      storageContract,
      web3,
      strategyId,
      isTransactionProdMode,
    } = data;

    let earnedAmount = toBN(0);

    if (isClaimVenus) {
      earnedAmount = earnedAmount.add(
        await this.claimVenusService.claimVenusRewards({
          uid,
          logicContract,
          storageContract,
          web3,
          isTransactionProdMode,
        }),
      );
    }

    if (isClaimFarms) {
      earnedAmount = earnedAmount.add(
        await this.claimFarmsService.claimFarmsRewards({
          uid,
          logicContract,
          storageContract,
          strategyId,
          web3,
        }),
      );
    }

    if (isClaimLended) {
      earnedAmount = earnedAmount.add(
        await this.bolidLibService.withdrawVenusAdditionalLendedTokens({
          uid,
          logicContract,
          storageContract,
          web3,
          isTransactionProdMode,
        }),
      );
    }

    this.logger.debug({
      message: 'claimRewards result',
      earnedAmount: fromWeiToStr(earnedAmount),
    });

    return earnedAmount;
  }

  async distributeBlidAll(data: {
    blidTokensToDistribute: BigNumber;
    uid: string;
    lastClaimBlockNumber: number;
    strategyId: number;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }): Promise<BigNumber> {
    const {
      blidTokensToDistribute,
      uid,
      logicContract,
      storageContract,
      web3,
      strategyId,
      isTransactionProdMode,
    } = data;

    const strategy = await this.strategiesService.getStrategyById(strategyId);

    if (!strategy) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY);
    }

    const settings = strategy.settings as LandBorrowFarmSettingsDto;

    const {
      isDistributeIfNegativeBalance,
      isFailedDistributeNotification,
      maxBlidRewardsDestribution,
    } = settings;

    const maxBlidRewardsDestributionWei = toWeiBN(maxBlidRewardsDestribution);

    let ltOrEqualMaxBlidToDistribute = toBN('0');

    ltOrEqualMaxBlidToDistribute = isDistributeIfNegativeBalance
      ? maxBlidRewardsDestributionWei
      : BigNumber.min(blidTokensToDistribute, maxBlidRewardsDestributionWei);

    this.logger.debug({
      message: 'distributeBlidAll execute',
      blidTokensToDistribute,
      maxBlidRewardsDestribution,
      ltOrEqualMaxBlidToDistribute,
    });

    await this.makeStrategyBoosting(data);

    const blidToken = await this.contractsService.getTokenByName(
      logicContract.blockchainId,
      TOKEN_NAMES.BLID,
    );

    const { amount: availableBlid } =
      await this.tokenEthService.getTokenAvailableAmount({
        tokenAddress: blidToken.address,
        walletAddress: logicContract.address,
        storageContract,
        web3,
      });

    const availableOrLtTolensToDistribute = BigNumber.min(
      availableBlid,
      ltOrEqualMaxBlidToDistribute,
    );

    this.logger.debug({
      message: 'Before addEarnToStorage',
      availableOrLtTolensToDistribute: fromWeiToStr(
        availableOrLtTolensToDistribute,
      ),
      availableBlid: fromWeiToStr(availableBlid),
      blidTokensToDistribute,
      totalToDistributeBlid: fromWeiToStr(ltOrEqualMaxBlidToDistribute),
      uid,
    });

    const MIN_BLID_TO_DISTRIBUTE = toWeiBN(1);

    const isDistributing = availableOrLtTolensToDistribute.gt(
      MIN_BLID_TO_DISTRIBUTE,
    );

    if (isDistributing) {
      const logicContractWeb3 = new web3.eth.Contract(
        LOGIC.abi,
        logicContract.address,
      );

      const m = await logicContractWeb3.methods.addEarnToStorage(
        safeBN(availableOrLtTolensToDistribute),
      );

      await this.transactionsService.sendTransaction({
        transaction: m,
        method: 'addEarnToStorage',
        meta: {
          amount: availableOrLtTolensToDistribute.toString(),
        },
        uid,
        func: 'distributeBLIDAll',
        web3,
        isTransactionProdMode,
      });
    } else {
      if (isFailedDistributeNotification) {
        await this.telegramService.sendMessageToGroup(
          TG_MESSAGES.NOT_DISTRIBUTE({
            uid,
            available: fromWeiToNum(availableOrLtTolensToDistribute).toFixed(2),
            limit: fromWeiToNum(MIN_BLID_TO_DISTRIBUTE).toFixed(2),
          }),
        );
      }
    }

    const result = isDistributing ? availableOrLtTolensToDistribute : toBN(0);

    this.logger.debug({
      message: 'distributeBLIDAll finished',
      tokens: fromWeiToStr(result),
    });

    return result;
  }

  async calcBlidDataToDistribute(data: {
    logicContract: ContractDto;
    strategyId: number;
    operationId: string;
    web3: Web3;
  }): Promise<{
    price: BigNumber;
    amount: BigNumber;
    amountUSD: number;
  }> {
    const { logicContract, strategyId, operationId, web3 } = data;

    const blidToken = await this.contractsService.getBlidContract(
      logicContract.blockchainId,
    );

    const price = await this.uniswapEthService.getTokenPriceUSD({
      asset: blidToken.name,
      platform: PLATFORMS.PANCAKESWAP,
      web3,
    });

    const result = await this.lbfAnalyticsService.calcAnalytics({
      strategyId,
      web3,
    });

    const amountUSD = Number(result.amount);

    let amount = toBN(0);

    if (amountUSD > 0) {
      amount = toWeiBN(amountUSD / fromWeiToNum(price));
    }

    this.logger.debug({
      message: 'calcBlidDataToDistribute',
      amountUSD,
      blidTokensToDistribute: fromWeiToStr(amount),
      price: fromWeiToNum(price),
      strategyId,
      uid: operationId,
    });

    return {
      amountUSD,
      amount,
      price,
    };
  }

  async runClaimRewards(data: {
    operationId: string;
    logicContract: ContractDto;
    storageContract: ContractDto;
    strategyId: number;
    web3: Web3;
    isTransactionProdMode: boolean;
  }): Promise<WithTransactionsRespDto> {
    const {
      operationId,
      logicContract,
      storageContract,
      strategyId,
      web3,
      isTransactionProdMode,
    } = data;

    const lastStrategyOperation =
      await this.operationService.getLastStrategyOperationLog(strategyId);

    if (lastStrategyOperation.status !== OPERATION_STATUS.SUCCESS) {
      throw new LogicException(ERROR_CODES.LAST_OPERATION_IS_NOT_SUCCESS);
    }

    const strategy = await this.strategiesService.getStrategyById(strategyId);
    const { isFailedDistributeNotification, isDistributeIfNegativeBalance } =
      strategy.settings as LandBorrowFarmSettingsDto;

    const lastClaim = await this.operationService.getLastClaimGtZeroLog({
      strategyId,
    });

    const earned = await this.claimFarmsService.claimFarmsRewards({
      uid: operationId,
      logicContract,
      storageContract,
      strategyId,
      web3,
    });

    const {
      amountUSD,
      amount: blidTokensToDistribute,
      price,
    } = await this.calcBlidDataToDistribute({
      strategyId,
      operationId,
      logicContract,
      web3,
    });

    if (amountUSD < 0 && isFailedDistributeNotification) {
      await this.telegramService.sendMessageToGroup(
        TG_MESSAGES.NEGATIVE_BALANCE({
          amount: amountUSD,
          strategyId,
          operationId,
        }),
      );
    }

    const distributedTokens =
      blidTokensToDistribute.gt(toBN(0)) || isDistributeIfNegativeBalance
        ? await this.distributeBlidAll({
            blidTokensToDistribute,
            uid: operationId,
            lastClaimBlockNumber: lastClaim?.meta?.payload?.lastTxBlockNumber,
            logicContract,
            strategyId,
            storageContract,
            web3,
            isTransactionProdMode,
          })
        : toBN(0);

    const { items: transactions } =
      await this.transactionsService.getTransactionsByUid(operationId);

    let lastTxBlockNumber = null;

    if (transactions.length > 0) {
      lastTxBlockNumber = transactions[0]?.transactionRaw?.blockNumber;
    }

    const updatedOperation = await this.operationService.findOneById(
      operationId,
    );

    const adminBalanceAfter = await this.balanceService.getAdminBalances({
      strategyId,
      web3,
    });

    const boostBalanceAfter = await this.boostingService.getBoostingBalances(
      strategyId,
    );

    await this.operationService.update(
      {
        id: operationId,
      },
      {
        meta: {
          ...updatedOperation.meta,
          adminBalanceAfter,
          boostBalanceAfter,
          payload: {
            ...updatedOperation.meta?.payload,
            earnBlid: fromWeiToNum(
              BigNumber.max(earned, distributedTokens),
            ).toString(),
            priceBlid: fromWeiToNum(price).toString(),
            earnUsd: fromWeiToNum(
              BigNumber.max(price.mul(earned), price.mul(distributedTokens)),
            ).toString(),
            wallet: logicContract.address,
            lastTxBlockNumber,
          },
        },
      },
    );

    return { items: transactions, uid: operationId };
  }
}
