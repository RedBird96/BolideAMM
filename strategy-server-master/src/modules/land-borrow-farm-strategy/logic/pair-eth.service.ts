import { Injectable, Logger } from '@nestjs/common';
import { PLATFORMS } from 'src/common/constants/platforms';
import {
  fromWeiToNum,
  fromWeiToStr,
  toBN,
} from 'src/common/utils/big-number-utils';
import { BigNumber } from 'src/common/utils/BigNumber';
import { BnbUtilsService } from 'src/modules/bnb/bnb-utils.service';
import { FarmEthService } from 'src/modules/bnb/farm/farm-eth.service';
import type { Farm } from 'src/modules/bnb/interfaces/farm.interface';
import { MulticallSendService } from 'src/modules/bnb/multicall/multicall-send.service';
import { TokenEthService } from 'src/modules/bnb/token/token-eth.service';
import { TransactionsService } from 'src/modules/bnb/transactions.service';
import { VenusEthService } from 'src/modules/bnb/venus/venus-eth.service';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import type { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import type Web3 from 'web3';

import { LOGIC } from '../../bnb/bolide/logic';
import { LiquidityInService } from './liquidity-in.service';
import { LiquidityOutService } from './liquidity-out.service';

@Injectable()
export class PairEthService {
  private readonly logger = new Logger(PairEthService.name);

  constructor(
    private readonly bnbUtilsService: BnbUtilsService,
    private readonly tokenEthService: TokenEthService,
    private readonly venusEthService: VenusEthService,
    private readonly farmEthService: FarmEthService,
    private readonly liquidityOutService: LiquidityOutService,
    private readonly liquidityInService: LiquidityInService,
    private readonly transactionsService: TransactionsService,
    private readonly contractsService: ContractsService,
    private readonly multicallSendSerivce: MulticallSendService,
  ) {}

  // borrow liquidity, adds liquidity to swap and stake it
  async addPairsLiquidity(data: {
    farmsWithPercentage: Array<{ farm: Farm; percentage: number }>;
    liquidity: BigNumber;
    uid: string;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }) {
    const {
      farmsWithPercentage,
      liquidity,
      uid,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
    } = data;
    this.logger.debug({
      message: 'executing addPairsLiquidity',
      farmsWithPercentage,
      uid,
      liquidity: fromWeiToStr(liquidity),
    });

    const pairAmountList = [];

    this.logger.debug({ message: 'calculate tokens to borrow', uid });
    const TOKENS_TO_BORROW: Record<string, BigNumber> = {};

    const addToBorrow = (tokenAddress: string, amount: BigNumber) => {
      if (TOKENS_TO_BORROW[tokenAddress]) {
        TOKENS_TO_BORROW[tokenAddress] =
          TOKENS_TO_BORROW[tokenAddress].add(amount);
      } else {
        TOKENS_TO_BORROW[tokenAddress] = toBN(0).add(amount);
      }
    };

    for (const i in farmsWithPercentage) {
      const farm = farmsWithPercentage[i].farm;
      const percentage = farmsWithPercentage[i].percentage;
      const farmLiquidity = liquidity.mul(toBN(percentage));

      const approvedArr = [
        { token: farm.lpAddress, isLP: true },
        { token: farm.asset1Address, isLP: false },
        { token: farm.asset2Address, isLP: false },
      ];

      for (const { token, isLP } of approvedArr) {
        const { platform, type } = isLP
          ? { platform: farm.platform, type: CONTRACT_TYPES.MASTER }
          : { platform: PLATFORMS.PANCAKESWAP, type: CONTRACT_TYPES.ROUTER };

        const spenderContract = await this.contractsService.getContract({
          blockchainId: logicContract.blockchainId,
          platform,
          type,
        });

        const isAllowed = await this.tokenEthService.checkAllowance({
          token,
          owner: logicContract.address,
          spender: spenderContract.address,
          web3,
        });

        if (!isAllowed) {
          await this.approveTokenForSwap({
            tokenAddress: token,
            uid,
            logicContract,
            web3,
            isTransactionProdMode,
          });
        }
      }

      await this.approveFarm({
        farm,
        uid,
        storageContract,
        logicContract,
        web3,
        isTransactionProdMode,
      });

      const pairAmounts = await this.liquidityInService.calcPairAmounts({
        farm,
        liquidityWei: farmLiquidity,
        logicContract,
        storageContract,
        web3,
      });

      pairAmountList.push(pairAmounts);

      addToBorrow(farm.asset1Address, pairAmounts.token1Amount);
      addToBorrow(farm.asset2Address, pairAmounts.token2Amount);
    }

    const mapArr = Object.entries(TOKENS_TO_BORROW);
    this.logger.debug({
      message:
        'tokens to borrow(amounts without available tokens on logic contract)',
      tokens: mapArr.map(async ([address, borrowAmount]) => ({
        [await this.bnbUtilsService.getTokenNameByAddress({
          address,
          storageContract,
        })]: fromWeiToNum(borrowAmount),
      })),
      uid,
    });

    const borrowTxList = [];

    for (const [tokenAddress, borrowAmount] of mapArr) {
      const { amount: availableAmount } =
        await this.tokenEthService.getTokenAvailableAmount({
          tokenAddress,
          walletAddress: logicContract.address,
          storageContract,
          web3,
        });

      const { tx, meta } = await this.venusEthService.borrowToken({
        tokenAddress,
        borrowAmount: BigNumber.max(borrowAmount.sub(availableAmount), toBN(0)),
        uid,
        logicContract,
        storageContract,
        web3,
        isTransactionProdMode,
      });

      borrowTxList.push({ tx, meta });
    }

    await this.multicallSendSerivce.sendMulticall({
      txArr: borrowTxList,
      contract: logicContract,
      method: 'borrow',
      isTransactionProdMode,
      web3,
      uid,
    });

    this.logger.debug({ message: 'start to use borrowed tokens', uid });

    const addLiquidityTxList = await Promise.all(
      farmsWithPercentage.map((value, i) =>
        this.farmEthService.addLiquidity({
          farm: value.farm,
          pairAmounts: pairAmountList[i],
          uid,
          storageContract,
          logicContract,
          web3,
          isTransactionProdMode,
        }),
      ),
    );

    await this.multicallSendSerivce.sendMulticall({
      txArr: addLiquidityTxList,
      contract: logicContract,
      method: 'addLiquidity',
      isTransactionProdMode,
      web3,
      uid,
    });

    const depositTxList = await Promise.all(
      farmsWithPercentage.map((value) =>
        this.liquidityInService.stakeAvailableLpTokenToFarm({
          farm: value.farm,
          uid,
          logicContract,
          storageContract,
          web3,
          isTransactionProdMode,
        }),
      ),
    );

    await this.multicallSendSerivce.sendMulticall({
      txArr: depositTxList,
      contract: logicContract,
      method: 'deposit',
      isTransactionProdMode,
      web3,
      uid,
    });

    await this.addReservesToLogic({
      farms: farmsWithPercentage.map(({ farm }) => farm),
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
      uid,
      isApiCall: false,
    });

    const pairs = farmsWithPercentage.map((el) => {
      const farmLiquidity = fromWeiToStr(liquidity.mul(toBN(el.percentage)));

      return `${el.farm.pair}-${el.farm.platform} ${farmLiquidity}`;
    });

    this.logger.debug({
      message: 'all pairs were created successfully',
      pairs,
      uid,
    });
  }

  public async addReservesToLogic(data: {
    farms: Farm[];
    uid: string;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
    isApiCall: boolean;
  }) {
    const {
      uid,
      farms,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
      isApiCall,
    } = data;

    const addReserveTxList = [];

    for (const farm of farms) {
      const txData = await this.liquidityInService.addReserveToLogic({
        farm,
        uid,
        logicContract,
        storageContract,
        web3,
        isTransactionProdMode,
        isApiCall,
      });

      if (txData && txData.tx) {
        addReserveTxList.push(txData);
      }
    }

    await this.multicallSendSerivce.sendMulticall({
      txArr: addReserveTxList,
      contract: logicContract,
      method: 'addReserve',
      isTransactionProdMode,
      web3,
      uid,
    });
  }

  // take all liquidity from Swaps and return it to Venus
  // remove from farming, remove lp token from Swap, repay borrow
  async destructPairs(data: {
    percentage: number;
    uid: string;
    isWithdrawAllToStorage?: boolean;
    isRepayAllLoans?: boolean;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }) {
    const {
      percentage,
      isRepayAllLoans = false,
      isWithdrawAllToStorage = false,
      uid,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
    } = data;
    this.logger.debug({
      message: 'executing destructPairs',
      percentage,
      isRepayAllLoans,
      isWithdrawAllToStorage,
      uid,
    });

    const stakedFarms = await this.farmEthService.getStakedFarms({
      storageContract,
      logicContract,
      isDestructPairs: true,
    });

    const tokenSet = new Set<string>();

    this.logger.debug({
      message: 'start to unstake farm tokens',
      stakedFarms: stakedFarms.map((el) => el.pair),
      uid,
    });

    const withrawTxList = await Promise.all(
      stakedFarms.map((stakedFarm) =>
        this.liquidityOutService.unstakeLpTokenFromFarm({
          farm: stakedFarm,
          percentage,
          uid,
          logicContract,
          storageContract,
          web3,
          isTransactionProdMode,
        }),
      ),
    );

    await this.multicallSendSerivce.sendMulticall({
      txArr: withrawTxList,
      contract: logicContract,
      method: 'withdraw',
      isTransactionProdMode,
      web3,
      uid,
    });

    const lpFarms = await this.farmEthService.getLiquidityPoolFarms({
      storageContract,
      logicContract,
      isDestructPairs: true,
    });

    this.logger.debug({
      message: 'start to remove liquidity from pools',
      pairs: lpFarms.map((el) => el.pair),
      uid,
    });

    const rmLiqTxList = [];

    for (const lpFarm of lpFarms) {
      await this.approveFarm({
        farm: lpFarm,
        uid,
        storageContract,
        logicContract,
        web3,
        isTransactionProdMode,
      });

      const txData = await this.farmEthService.removeLiquidity({
        farm: lpFarm,
        uid,
        storageContract,
        logicContract,
        web3,
        isTransactionProdMode,
      });

      if (txData) {
        rmLiqTxList.push(txData);
      }

      tokenSet.add(lpFarm.asset1Address);
      tokenSet.add(lpFarm.asset2Address);
    }

    await this.multicallSendSerivce.sendMulticall({
      txArr: rmLiqTxList,
      contract: logicContract,
      method: 'removeLiquidity',
      isTransactionProdMode,
      web3,
      uid,
    });

    const tokens = [...tokenSet];
    this.logger.debug({
      message: 'start to repay borrowed tokens',
      tokens: await this.bnbUtilsService.getTokenNameByAddressArr({
        tokens,
        storageContract,
      }),
      uid,
    });

    const repayBorrowTxList = [];

    for (const tokenAddress of tokens) {
      const txData = await this.venusEthService.repayBorrowToken({
        tokenAddress,
        uid,
        logicContract,
        storageContract,
        isTransactionProdMode,
        web3,
      });

      if (txData) {
        repayBorrowTxList.push(txData);
      }
    }

    await this.multicallSendSerivce.sendMulticall({
      txArr: repayBorrowTxList,
      contract: logicContract,
      method: 'repayBorrow',
      isTransactionProdMode,
      web3,
      uid,
    });

    if (isRepayAllLoans) {
      await this.liquidityOutService.repayAllLoans({
        borrowedTokens: tokens,
        isWithdrawAllToStorage,
        uid,
        logicContract,
        storageContract,
        web3,
        isTransactionProdMode,
      });

      await this.liquidityOutService.deleteAllReservesFromLogic({
        uid,
        logicContract,
        web3,
        isTransactionProdMode,
      });
    }

    this.logger.debug({ message: 'destructPairs done', uid });
  }

  // adds Venus vToken 'tokenAddress', if new token is available to work on Venus
  async approveTokenForSwap(data: {
    tokenAddress: string;
    uid: string;
    logicContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }) {
    const { tokenAddress, uid, logicContract, web3, isTransactionProdMode } =
      data;

    this.logger.debug({
      message: 'executing approveTokenForSwap',
      tokenAddress,
      uid,
      logicContract: logicContract.address,
    });

    const logicContractWeb3 = new web3.eth.Contract(
      LOGIC.abi,
      logicContract.address,
    );

    const m = logicContractWeb3.methods.approveTokenForSwap(tokenAddress);

    await this.transactionsService.sendTransaction({
      transaction: m,
      method: 'approveTokenForSwap',
      meta: {
        token: tokenAddress,
      },
      uid,
      func: 'approveTokenForSwap',
      web3,
      isTransactionProdMode,
    });

    this.logger.debug({
      message: 'approveTokenForSwap result',
      token: tokenAddress,
    });
  }

  private async approveFarm(data: {
    farm: Farm;
    uid: string;
    storageContract: ContractDto;
    logicContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }) {
    const {
      farm,
      uid,
      storageContract,
      logicContract,
      web3,
      isTransactionProdMode,
    } = data;

    const approvedArr = [
      { token: farm.lpAddress, isLP: true },
      { token: farm.asset1Address, isLP: false },
      { token: farm.asset2Address, isLP: false },
    ];

    for (const { token, isLP } of approvedArr) {
      const spenderContract = await this.contractsService.getContract({
        blockchainId: storageContract.blockchainId,
        platform: farm.platform,
        type: isLP ? CONTRACT_TYPES.MASTER : CONTRACT_TYPES.ROUTER,
      });

      const isAllowed = await this.tokenEthService.checkAllowance({
        token,
        owner: logicContract.address,
        spender: spenderContract.address,
        web3,
      });

      if (!isAllowed) {
        await this.approveTokenForSwap({
          tokenAddress: token,
          uid,
          logicContract,
          web3,
          isTransactionProdMode,
        });
      }
    }
  }
}
