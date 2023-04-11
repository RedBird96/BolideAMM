import { Injectable, Logger } from '@nestjs/common';
import { PLATFORMS } from 'src/common/constants/platforms';
import { TG_MESSAGES } from 'src/common/constants/tg-messages';
import {
  fromWeiToStr,
  safeBN,
  toBN,
  toWeiBN,
} from 'src/common/utils/big-number-utils';
import { BigNumber } from 'src/common/utils/BigNumber';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';
import { BnbUtilsService } from 'src/modules/bnb/bnb-utils.service';
import { FarmEthService } from 'src/modules/bnb/farm/farm-eth.service';
import { MulticallSendService } from 'src/modules/bnb/multicall/multicall-send.service';
import { TokenEthService } from 'src/modules/bnb/token/token-eth.service';
import { TransactionsService } from 'src/modules/bnb/transactions.service';
import {
  SLIPPAGE,
  UniswapEthService,
} from 'src/modules/bnb/uniswap/uniswap-eth.service';
import { VenusEthService } from 'src/modules/bnb/venus/venus-eth.service';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { TOKEN_NAMES } from 'src/modules/contracts/constants/token-names';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import type { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import { TelegramService } from 'src/modules/telegram/telegram.service';
import type Web3 from 'web3';
import type { ContractSendMethod } from 'web3-eth-contract';

import { LOGIC } from '../../bnb/bolide/logic';
import type { Farm } from '../../bnb/interfaces/farm.interface';

@Injectable()
export class LiquidityOutService {
  private readonly logger = new Logger(LiquidityOutService.name);

  constructor(
    private readonly bnbUtilsService: BnbUtilsService,
    private readonly uniswapEthService: UniswapEthService,
    private readonly tokenEthService: TokenEthService,
    private readonly venusEthService: VenusEthService,
    private readonly farmEthService: FarmEthService,
    private readonly transactionsService: TransactionsService,
    private readonly telegramService: TelegramService,
    private readonly blockchainsService: BlockchainsService,
    private readonly contractsService: ContractsService,
    private readonly multicallSendSerivce: MulticallSendService,
  ) {}

  async repayAllLoans(data: {
    borrowedTokens: string[];
    isWithdrawAllToStorage: boolean;
    uid: string;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }): Promise<void> {
    const {
      borrowedTokens,
      isWithdrawAllToStorage = false,
      uid,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
    } = data;

    this.logger.debug({
      message: 'Executing repayAllLoans',
      borrowedTokens,
      uid,
    });

    const skipForFarmTokenSwap = new Set();

    this.logger.debug({
      message:
        'Swap the rest of borrowed venus tokens(which loan was repaid) to BNB',
      borrowedTokens: await this.bnbUtilsService.getTokenNameByAddressArr({
        tokens: borrowedTokens,
        storageContract,
      }),
      uid,
    });

    for (const tokenAddress of borrowedTokens) {
      const { amount: available } =
        await this.tokenEthService.getTokenAvailableAmount({
          tokenAddress,
          walletAddress: logicContract.address,
          storageContract,
          web3,
        });

      const tokenName = await this.bnbUtilsService.getTokenNameByAddress({
        address: tokenAddress,
        storageContract,
      });

      // TVL: PancakeSwap $2.79b/BiSwap $242.22m/ApeSwap $57.23m/https://defillama.com/chain/BSC
      const platform =
        tokenName === TOKEN_NAMES.FIL
          ? PLATFORMS.APESWAP
          : PLATFORMS.PANCAKESWAP;

      if (available.gt(toWeiBN(0.01))) {
        await this.swapToBNB({
          token1: tokenAddress,
          amount: available,
          platform,
          uid,
          storageContract,
          logicContract,
          web3,
          isTransactionProdMode,
        });
        skipForFarmTokenSwap.add(tokenAddress);
      }
    }

    // Farm Swaps

    const farmTokenList = [
      { symbol: TOKEN_NAMES.CAKE, platform: PLATFORMS.PANCAKESWAP },
      { symbol: TOKEN_NAMES.BANANA, platform: PLATFORMS.APESWAP },
      { symbol: TOKEN_NAMES.BSW, platform: PLATFORMS.BISWAP },
      { symbol: TOKEN_NAMES.BLID, platform: PLATFORMS.PANCAKESWAP },
    ];

    this.logger.debug({
      message: 'Swap the rest of farmTokens to BNB',
      farmTokenList: farmTokenList.map((farm) => farm.symbol),
      uid,
    });

    for (const farmToken of farmTokenList) {
      const tokenAddress = await this.bnbUtilsService.getTokenAddressesByName(
        farmToken.symbol,
      );

      // skip farm token if already swaped
      if (!skipForFarmTokenSwap.has(tokenAddress)) {
        const { amount: available } =
          await this.tokenEthService.getTokenAvailableAmount({
            tokenAddress,
            walletAddress: logicContract.address,
            storageContract,
            web3,
          });

        if (available.gt(toWeiBN(0.01))) {
          await this.swapToBNB({
            token1: tokenAddress,
            amount: available,
            platform: farmToken.platform,
            uid,
            storageContract,
            logicContract,
            web3,
            isTransactionProdMode,
          });
        }
      }
    }

    // RepayBorrow Swaps

    this.logger.debug({ message: 'Swap BNB to repay rest venus loans', uid });

    const bnbBlockchain =
      await this.blockchainsService.getBnbBlockchainEntity();

    const bnbToken = await this.contractsService.getTokenByName(
      bnbBlockchain.id,
      TOKEN_NAMES.BNB,
    );

    const venusTokens = await this.contractsService.getVenusTokens(
      bnbBlockchain.id,
    );

    for (const vObj of venusTokens) {
      const token = await this.contractsService.getTokenByInnerToken(vObj);

      const { amount: borrowBalance } =
        await this.venusEthService.getBorrowBalance({
          vTokenAddress: vObj.address,
          address: token.address,
          logicContract,
          web3,
        });

      if (borrowBalance.gt(toBN(0))) {
        const bnbToRepayLoan =
          await this.uniswapEthService.getTokenConversionRate({
            asset: bnbToken.name,
            platform: PLATFORMS.PANCAKESWAP,
            assetTo: token.name,
            amount: borrowBalance,
            isAmountsIn: true,
            web3,
          });

        const { amount: availableBNB } =
          await this.tokenEthService.getTokenAvailableAmount({
            tokenAddress: bnbToken.address,
            walletAddress: logicContract.address,
            storageContract,
            web3,
          });

        const tokenAddress = token.address;

        this.logger.debug({
          message: 'repayAllLoans > repay venus loan',
          venusToken: await this.bnbUtilsService.getTokenNameByAddress({
            address: tokenAddress,
            storageContract,
          }),
          bnbToRepayLoan: fromWeiToStr(bnbToRepayLoan),
          availableBNB: fromWeiToStr(availableBNB),
          isWithdrawAllToStorage,
          uid,
        });

        const tokensToSwap = BigNumber.min(availableBNB, bnbToRepayLoan);

        const bnbLimit = isWithdrawAllToStorage
          ? toWeiBN(0.000_001)
          : toWeiBN(0.000_01);

        const isSwap = tokensToSwap.gt(bnbLimit);

        if (isSwap) {
          const bnbToRepayLoanWithSlippage = bnbToRepayLoan.add(
            bnbToRepayLoan.mul(SLIPPAGE),
          );

          const [amount, isReverseSwap] = bnbToRepayLoanWithSlippage.gt(
            availableBNB,
          )
            ? [availableBNB, false]
            : [borrowBalance, true];

          await this.uniswapEthService.swap({
            token1: bnbToken.address,
            token2: tokenAddress,
            amount,
            platform: PLATFORMS.PANCAKESWAP,
            isReverseSwap,
            uid,
            storageContract,
            logicContract,
            web3,
            isTransactionProdMode,
          });

          const repayBorrowTxData = await this.venusEthService.repayBorrowToken(
            {
              tokenAddress,
              uid,
              logicContract,
              storageContract,
              web3,
              isTransactionProdMode,
            },
          );

          if (repayBorrowTxData && repayBorrowTxData.tx) {
            await this.transactionsService.sendTransaction({
              transaction: repayBorrowTxData.tx,
              meta: repayBorrowTxData.meta,
              method: 'repayBorrow',
              isTransactionProdMode,
              func: 'repayAllLoans',
              web3,
              uid,
            });
          }
        }

        if (tokensToSwap.eq(availableBNB)) {
          await this.sendDebtWarning({
            tokenAddress,
            bnbToRepayLoan,
            availableBNB,
            isSwap,
            uid,
            storageContract,
          });
        }
      }
    }
  }

  private async sendDebtWarning(data: {
    tokenAddress: string;
    bnbToRepayLoan: BigNumber;
    availableBNB: BigNumber;
    isSwap: boolean;
    uid: string;
    storageContract: ContractDto;
  }): Promise<void> {
    const {
      storageContract,
      tokenAddress,
      bnbToRepayLoan,
      availableBNB,
      isSwap,
      uid,
    } = data;

    const tokenName = await this.bnbUtilsService.getTokenNameByAddress({
      address: tokenAddress,
      storageContract,
    });

    const diff = isSwap
      ? fromWeiToStr(bnbToRepayLoan.sub(availableBNB))
      : fromWeiToStr(bnbToRepayLoan);

    const preMsg = isSwap
      ? 'Остался долг(в BNB) после repayBorrow'
      : 'Недостаточно BNB для repayBorrow';

    const warning = TG_MESSAGES.DEBT_WARNING({ preMsg, tokenName, diff, uid });
    await this.telegramService.sendMessageToGroup(warning);
  }

  // unstake all lp tokens from farming
  public async unstakeLpTokenFromFarm(data: {
    farm: Farm;
    percentage: number;
    uid: string;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }): Promise<{
    tx: ContractSendMethod;
    meta: Record<string, unknown>;
  }> {
    const {
      farm,
      percentage,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
    } = data;

    this.logger.debug({
      message: 'unstakeLpTokenFromFarm params',
      pair: farm.pair,
      platform: farm.platform,
      isTransactionProdMode,
      percentage,
    });

    const macterChef = await this.contractsService.getContract({
      blockchainId: logicContract.blockchainId,
      platform: farm.platform,
      type: CONTRACT_TYPES.MASTER,
    });

    let amount = await this.farmEthService.getStakedAmount({
      farm,
      logicContract,
      storageContract,
      web3,
    });

    amount = percentage === 1 ? amount : amount.mul(toBN(percentage));

    this.logger.debug({
      message: 'unstakeLpTokenFromFarm new amount',
      amount: fromWeiToStr(amount),
    });

    const logicContractWeb3 = new web3.eth.Contract(
      LOGIC.abi,
      logicContract.address,
    );

    const tx = logicContractWeb3.methods.withdraw(
      macterChef.address,
      farm.pid,
      safeBN(amount),
    );

    const meta = {
      swapMaster: macterChef.address,
      pid: farm.pid,
      amount: amount.toString(),
    };

    return { tx, meta };
  }

  // clear reserve list of Logic contract
  public async deleteAllReservesFromLogic(data: {
    uid: string;
    logicContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }): Promise<void> {
    const { logicContract, web3, uid, isTransactionProdMode } = data;

    this.logger.debug({
      message: 'executing deleteAllReservesFromLogic',
      uid,
      logicContract: logicContract.address,
    });

    const logicContractWeb3 = new web3.eth.Contract(
      LOGIC.abi,
      logicContract.address,
    );

    if (isTransactionProdMode) {
      const count = await logicContractWeb3.methods.getReservesCount().call();

      const deleteLastReserveArr = [];

      for (let i = 0; i < count; i++) {
        deleteLastReserveArr.push(this.deleteLastReserveFromLogic(data));
      }

      await this.multicallSendSerivce.sendMulticall({
        txArr: deleteLastReserveArr,
        contract: logicContract,
        method: 'deleteLastReserveLiquidity',
        isTransactionProdMode,
        web3,
        uid,
      });
    }
  }

  // delete the last element of reserve list of Logic contract
  private deleteLastReserveFromLogic(data: {
    uid: string;
    logicContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }): { tx: ContractSendMethod; meta: Record<string, unknown> } {
    const { uid, logicContract, web3 } = data;

    this.logger.debug({
      message: 'executing deleteLastReserveFromLogic',
      logicContract: logicContract.address,
      uid,
    });

    const logicContractWeb3 = new web3.eth.Contract(
      LOGIC.abi,
      logicContract.address,
    );

    const tx = logicContractWeb3.methods.deleteLastReserveLiquidity();

    return { tx, meta: {} };
  }

  private async swapToBNB(data: {
    token1: string;
    amount: BigNumber;
    platform: PLATFORMS;
    uid: string;
    storageContract: ContractDto;
    logicContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }): Promise<void> {
    const bnbBlockchain =
      await this.blockchainsService.getBnbBlockchainEntity();

    const bnbToken = await this.contractsService.getTokenByName(
      bnbBlockchain.id,
      TOKEN_NAMES.BNB,
    );

    const {
      token1,
      amount,
      platform,
      uid,
      storageContract,
      web3,
      logicContract,
      isTransactionProdMode,
    } = data;

    this.logger.debug({ message: 'executing swapToBNB', uid });

    await this.uniswapEthService.swap({
      token1,
      token2: bnbToken.address,
      amount,
      platform,
      uid,
      storageContract,
      logicContract,
      web3,
      isTransactionProdMode,
    });
  }
}
