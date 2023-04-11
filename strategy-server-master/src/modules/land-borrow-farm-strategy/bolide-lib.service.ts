import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ORDER } from 'src/common/constants/order';
import { PLATFORMS } from 'src/common/constants/platforms';
import { TG_MESSAGES } from 'src/common/constants/tg-messages';
import {
  fromWeiToNum,
  fromWeiToStr,
  toBN,
  toWei,
  toWeiBN,
} from 'src/common/utils/big-number-utils';
import { BigNumber } from 'src/common/utils/BigNumber';
import type Web3 from 'web3';

import { BnbUtilsService } from '../bnb/bnb-utils.service';
import { LOGIC } from '../bnb/bolide/logic';
import { STORAGE } from '../bnb/bolide/storage';
import type { Farm } from '../bnb/interfaces/farm.interface';
import { TokenEthService } from '../bnb/token/token-eth.service';
import { TransactionsService } from '../bnb/transactions.service';
import { UniswapEthService } from '../bnb/uniswap/uniswap-eth.service';
import { VenusBalanceService } from '../bnb/venus/venus-balance.service';
import { VenusEthService } from '../bnb/venus/venus-eth.service';
import { CONTRACT_TYPES } from '../contracts/constants/contract-types';
import { ContractsService } from '../contracts/contracts.service';
import type { ContractDto } from '../contracts/dto/ContractDto';
import { StrategiesService } from '../strategies/strategies.service';
import { TelegramService } from '../telegram/telegram.service';
import { ClaimService } from './claim.service';
import type { LandBorrowFarmSettingsDto } from './dto/LandBorrowFarmSettingsDto';
import { LiquidityOutService } from './logic/liquidity-out.service';
import { LogicEthService } from './logic/logic-eth.service';
import { PairEthService } from './logic/pair-eth.service';
import { StorageEthService } from './logic/storage-eth.service';

@Injectable()
export class BolidLibService {
  private readonly logger = new Logger(BolidLibService.name);

  getDecimals: (address: string) => Promise<18 | 8>;

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly bnbUtilsService: BnbUtilsService,
    @Inject(forwardRef(() => ClaimService))
    private readonly claimService: ClaimService,
    private readonly uniswapEthService: UniswapEthService,
    private readonly tokenEthService: TokenEthService,
    private readonly venusEthService: VenusEthService,
    private readonly venusBalanceService: VenusBalanceService,
    private readonly pairEthService: PairEthService,
    private readonly logicEthService: LogicEthService,
    private readonly storageEthService: StorageEthService,
    private readonly telegramService: TelegramService,
    @Inject(forwardRef(() => StrategiesService))
    private readonly strategiesService: StrategiesService,
    private readonly contractsService: ContractsService,
    private readonly liquidityOutService: LiquidityOutService,
  ) {}

  async onModuleInit() {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    this.getDecimals = this.bnbUtilsService.getDecimals;
  }

  async runCreatePairs(data: {
    strategyId: number;
    farmsWithPercentage: Array<{ farm: Farm; percentage: number }>;
    isNeedToRecreateAll: boolean;
    uid: string;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }) {
    const {
      farmsWithPercentage,
      isNeedToRecreateAll,
      uid,
      logicContract,
      storageContract,
      web3,
      strategyId,
      isTransactionProdMode,
    } = data;

    if (isNeedToRecreateAll) {
      await this.claimService.claimRewards({
        isClaimVenus: true,
        isClaimLended: true,
        isClaimFarms: false,
        uid,
        logicContract,
        storageContract,
        web3,
        strategyId,
        isTransactionProdMode,
      });

      await this.pairEthService.destructPairs({
        percentage: 1,
        isRepayAllLoans: true,
        uid,
        logicContract,
        storageContract,
        web3,
        isTransactionProdMode,
      });
    }

    await this.rebalancePairs({
      farmsWithPercentage,
      uid,
      logicContract,
      storageContract,
      web3,
      strategyId,
    });
  }

  // calculates available amount and increase/decrease liquidity proportional to farm pairs
  async rebalancePairs(data: {
    strategyId: number;
    farmsWithPercentage: Array<{ farm: Farm; percentage: number }>;
    uid: string;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
  }) {
    const {
      strategyId,
      farmsWithPercentage,
      uid,
      logicContract,
      storageContract,
      web3,
    } = data;
    this.logger.debug({
      message: 'executing createPairs',
      farmsWithPercentage: farmsWithPercentage.map(({ farm, percentage }) => ({
        pair: farm.pair,
        percentage,
      })),
      uid,
    });

    const venusTokens = await this.contractsService.getVenusTokens(
      logicContract.blockchainId,
    );

    const vInfo = await this.venusBalanceService.getStrategyBalances({
      logicContract,
      web3,
      venusTokens,
    });

    const strategy = await this.strategiesService.getStrategyById(strategyId);

    const settings = strategy.settings as LandBorrowFarmSettingsDto;

    const liquidity = toWei(
      toBN(vInfo.totalBorrowLimit).mul(toBN(settings.borrowLimitPercentage)),
    ).sub(toWeiBN(vInfo.borrowUSD));

    const minLiquidityToCreatePairs =
      vInfo.totalBorrowLimit * settings.borrowLimitPercentageMin;

    const maxLiquidityToDestructPairs =
      vInfo.totalBorrowLimit * settings.borrowLimitPercentageMax;

    this.logger.debug({
      message: 'createPairs',
      minLiquidityToCreatePairs,
      maxLiquidityToDestructPairs,
      borrowUSD: vInfo.borrowUSD,
    });

    if (minLiquidityToCreatePairs > vInfo.borrowUSD) {
      this.logger.debug({
        message: 'liquidity',
        liquidity: fromWeiToNum(liquidity),
        value1: vInfo.totalBorrowLimit * settings.borrowLimitPercentage,
        borrowUSD: vInfo.borrowUSD,
      });

      await this.pairEthService.addPairsLiquidity({
        farmsWithPercentage,
        liquidity,
        uid,
        logicContract,
        storageContract,
        web3,
        isTransactionProdMode: settings.isTransactionProdMode,
      });
    }

    if (maxLiquidityToDestructPairs < vInfo.borrowUSD) {
      const destructPercentage =
        Math.abs(fromWeiToNum(liquidity)) / vInfo.borrowUSD;

      this.logger.debug({
        message: 'destructPercentage',
        destructPercentage,
      });

      await this.pairEthService.destructPairs({
        percentage: destructPercentage,
        uid,
        logicContract,
        storageContract,
        web3,
        isTransactionProdMode: settings.isTransactionProdMode,
      });
    }
  }

  // Get all rewards, destruct pairs and transfer storage tokens to storage contract
  async withdrawAllToStorage(data: {
    uid: string;
    storageContract: ContractDto;
    logicContract: ContractDto;
    web3: Web3;
    strategyId: number;
    isTransactionProdMode: boolean;
  }): Promise<void> {
    const {
      uid,
      storageContract,
      logicContract,
      web3,
      strategyId,
      isTransactionProdMode,
    } = data;

    await this.claimService.claimRewards({
      isClaimVenus: true,
      isClaimLended: true,
      isClaimFarms: false,
      uid,
      logicContract,
      storageContract,
      web3,
      strategyId,
      isTransactionProdMode,
    });

    await this.pairEthService.destructPairs({
      percentage: 1,
      isRepayAllLoans: true,
      isWithdrawAllToStorage: true,
      uid,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
    });

    await this.transferToStorageContract({
      uid,
      storageContract,
      logicContract,
      web3,
      isTransactionProdMode,
    });
  }

  // Get all rewards, destruct pairs and transfer storage tokens to storage contract
  async recreateReserves(data: {
    uid: string;
    storageContract: ContractDto;
    logicContract: ContractDto;
    web3: Web3;
    strategyId: number;
    isTransactionProdMode: boolean;
  }): Promise<void> {
    const {
      uid,
      storageContract,
      logicContract,
      web3,
      strategyId,
      isTransactionProdMode,
    } = data;

    const { items: strategyPairs } =
      await this.strategiesService.getStrategPairsByStrId(strategyId, {
        order: ORDER.DESC,
        orderField: 'createdAt',
        page: 1,
        take: 100,
      });

    const farms = strategyPairs.map((item) => item.pair.farm);

    await this.liquidityOutService.deleteAllReservesFromLogic({
      uid,
      logicContract,
      web3,
      isTransactionProdMode,
    });

    await this.pairEthService.addReservesToLogic({
      farms,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
      uid,
      isApiCall: true,
    });
  }

  async transferToStorageContract(data: {
    uid: string;
    storageContract: ContractDto;
    logicContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }): Promise<void> {
    const { uid, storageContract, logicContract, web3, isTransactionProdMode } =
      data;

    this.logger.debug({ message: 'executing transferToStorageContract', uid });

    const addresses = await this.contractsService.getStorageTokensAddress(
      storageContract,
    );

    for (const address of addresses) {
      let lendedAmount = toBN(0);

      try {
        const storageContractWeb3 = new web3.eth.Contract(
          STORAGE.abi as any,
          storageContract.address,
        );

        const depositedAmount = toBN(
          await storageContractWeb3.methods.getTokenDeposited(address).call(),
        );

        if (depositedAmount.eq(toBN(0))) {
          this.logger.debug({
            message: 'deposited amount, nothing to redeemUnderlying',
            token: await this.bnbUtilsService.getTokenNameByAddress({
              address,
              storageContract,
            }),
            amount: 0,
            uid,
          });

          continue;
        }

        ({ lendedAmount } = await this.venusEthService.getLendedTokenValue(
          address,
          storageContract,
          logicContract,
          web3,
        ));

        if (lendedAmount.gt(toBN(0))) {
          await this.venusEthService.redeemUnderlying({
            tokenAddress: address,
            tokensToWithdraw: lendedAmount,
            uid,
            storageContract,
            logicContract,
            web3,
            isTransactionProdMode,
          });

          await this.logicEthService.returnTokenToStorage({
            amountWei: lendedAmount,
            address,
            uid,
            logicContract,
            storageContract,
            web3,
            isTransactionProdMode,
          });
        } else {
          this.logger.debug({
            message: 'lended amount, nothing to redeemUnderlying',
            token: await this.bnbUtilsService.getTokenNameByAddress({
              address,
              storageContract,
            }),
            amount: 0,
            uid,
          });
        }
      } catch (error) {
        const token = await this.bnbUtilsService.getTokenNameByAddress({
          address,
          storageContract,
        });
        const amount = fromWeiToStr(lendedAmount);
        this.logger.warn({
          message: 'Error while executing transferToStorageContract',
          token,
          amount: fromWeiToStr(lendedAmount),
          uid,
        });

        await this.telegramService.sendMessageToGroup(
          TG_MESSAGES.TRANSFER_LEDNED_TO_STORAGE({
            amount,
            token,
            uid,
          }),
        );

        throw error;
      }
    }
  }

  // move all tokens from storage to Logic contract
  async takeTokensFromStorageAll(data: {
    uid: string;
    settings: LandBorrowFarmSettingsDto;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
  }): Promise<void> {
    const { uid, settings, storageContract, logicContract, web3 } = data;

    this.logger.debug({
      message: 'executing takeTokensFromStorageAll',
      uid,
      storageContract: storageContract.address,
      logicContract: logicContract.address,
    });

    const addresses = await this.contractsService.getStorageTokensAddress(
      storageContract,
    );

    for (const tokenAddress of addresses) {
      const amountToLogic =
        await this.storageEthService.calcStorageAmountToLogic({
          settings,
          tokenAddress,
          storageContract,
          web3,
        });

      this.logger.debug({
        message: 'prepare for takeTokenFromStorage',
        minTakeTokenFromStorageEther: settings.minTakeTokenFromStorageEther,
        amountToLogic: fromWeiToStr(amountToLogic),
        uid,
      });

      if (
        settings.minTakeTokenFromStorageEther &&
        amountToLogic.gt(toWei(toBN(settings.minTakeTokenFromStorageEther)))
      ) {
        await this.logicEthService.takeTokenFromStorage({
          amount: amountToLogic,
          tokenAddress,
          uid,
          logicContract,
          storageContract,
          web3,
          isTransactionProdMode: settings.isTransactionProdMode,
        });
      }

      const { amount } = await this.tokenEthService.getTokenAvailableAmount({
        tokenAddress,
        walletAddress: logicContract.address,
        storageContract,
        web3,
      });

      if (amount.gt(toBN(0))) {
        await this.venusEthService.mint(
          tokenAddress,
          amount,
          uid,
          logicContract,
          storageContract,
          web3,
          settings.isTransactionProdMode,
        );
      }
    }

    this.logger.debug({ message: 'takeTokensFromStorageAll done' });
  }

  // utils
  async withdrawVenusAdditionalLendedTokens(data: {
    uid: string;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }) {
    const { uid, logicContract, storageContract, web3, isTransactionProdMode } =
      data;

    this.logger.debug({
      message: 'executing withdrawVenusAdditionalLendedTokens',
      uid,
      logicContract: logicContract.address,
      storageContract: storageContract.address,
    });

    let earnedAmount = toBN(0);

    const storageTokens = await this.contractsService.getStorageTokens(
      storageContract,
    );

    const baseToken = await this.contractsService.getBlidContract(
      storageContract.blockchainId,
    );

    for (const storageToken of storageTokens) {
      let amount = await this.updateStorageTokenValue({
        tokenAddress: storageToken.address,
        uid,
        storageContract,
        logicContract,
        web3,
        isTransactionProdMode,
      });

      const { amount: availableAmount } =
        await this.tokenEthService.getTokenAvailableAmount({
          tokenAddress: storageToken.address,
          walletAddress: logicContract.address,
          storageContract,
          web3,
        });

      amount = BigNumber.min(amount, availableAmount);

      if (amount.gt(toWeiBN(0.1))) {
        await this.uniswapEthService.swap({
          token1: storageToken.address,
          token2: baseToken.address,
          amount,
          platform: PLATFORMS.PANCAKESWAP,
          uid,
          storageContract,
          logicContract,
          web3,
          isTransactionProdMode,
        });

        earnedAmount = earnedAmount.add(
          await this.uniswapEthService.getTokenConversionRate({
            asset: storageToken.name,
            platform: PLATFORMS.PANCAKESWAP,
            assetTo: baseToken.name,
            amount,
            web3,
          }),
        );
      }
    }

    this.logger.debug({
      message: 'withdrawVenusAdditionalLendedTokens result',
      earnedAmount: fromWeiToStr(earnedAmount),
    });

    return earnedAmount;
  }

  async updateStorageTokenValue(data: {
    tokenAddress: string;
    uid: string;
    storageContract: ContractDto;
    logicContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }) {
    const {
      tokenAddress,
      uid,
      storageContract,
      logicContract,
      web3,
      isTransactionProdMode,
    } = data;

    this.logger.debug({
      message: 'executing updateStorageTokenValue',
      tokenAddress,
      uid,
      storageContract: storageContract.address,
      logicContract: logicContract.address,
    });

    const storageContractWeb3 = new web3.eth.Contract(
      STORAGE.abi,
      storageContract.address,
    );

    const depositedAmount = toBN(
      await storageContractWeb3.methods.getTokenDeposited(tokenAddress).call(),
    );

    if (depositedAmount.eq(toBN(0))) {
      return toBN(0);
    }

    const { diff: tokensToWithdraw } =
      await this.venusEthService.getLendedTokenValue(
        tokenAddress,
        storageContract,
        logicContract,
        web3,
      );

    // withdraw
    if (tokensToWithdraw.gt(toBN(0))) {
      await this.venusEthService.redeemUnderlying({
        tokenAddress,
        tokensToWithdraw,
        uid,
        storageContract,
        logicContract,
        web3,
        isTransactionProdMode,
      });
    }

    this.logger.debug({
      message: 'updateStorageTokenValue result',
      tokensToWithdraw: fromWeiToStr(tokensToWithdraw),
    });

    return tokensToWithdraw;
  }

  async claimSwap(data: {
    uid: string;
    farm: Farm;
    logicContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }) {
    const { farm, uid, logicContract, web3, isTransactionProdMode } = data;

    this.logger.debug({
      message: 'executing claimSwap',
      farm,
      uid,
      logicContract: logicContract.address,
    });

    const macterChef = await this.contractsService.getContract({
      blockchainId: logicContract.blockchainId,
      platform: farm.platform,
      type: CONTRACT_TYPES.MASTER,
    });

    const logicContractWeb3 = new web3.eth.Contract(
      LOGIC.abi,
      logicContract.address,
    );

    const m = logicContractWeb3.methods.deposit(
      macterChef.address,
      farm.pid,
      '0',
    );

    await this.transactionsService.sendTransaction({
      transaction: m,
      method: 'deposit',
      meta: {
        swapMaster: macterChef.address,
        pid: farm.pid,
        amount: toBN(0).toString(),
      },
      uid,
      func: 'claimSwap',
      web3,
      isTransactionProdMode,
    });

    this.logger.debug({
      message: 'claimSwap result',
      swapMaster: macterChef.address,
      pid: farm.pid,
      amount: toBN(0).toString(),
    });
  }
}
