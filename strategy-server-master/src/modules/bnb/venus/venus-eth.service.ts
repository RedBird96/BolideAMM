import { Injectable, Logger } from '@nestjs/common';
import Decimal from 'decimal.js';
import { PLATFORMS } from 'src/common/constants/platforms';
import {
  fromWeiToNum,
  fromWeiToStr,
  numWei,
  safeBN,
  toBN,
} from 'src/common/utils/big-number-utils';
import { BigNumber } from 'src/common/utils/BigNumber';
import {
  fromBnToDecimal,
  fromBnWeiToDecimalNormal,
  fromWeiToDecimal,
} from 'src/common/utils/decimal-utils';
import { V_BEP } from 'src/modules/bnb/bolide/v-bep';
import { TOKEN_NAMES } from 'src/modules/contracts/constants/token-names';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import type { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import type { InnerTokenDto } from 'src/modules/contracts/dto/InnerTokenDataDto';
import type Web3 from 'web3';
import type { Contract, ContractSendMethod } from 'web3-eth-contract';

import { CONTRACT_TYPES } from '../../contracts/constants/contract-types';
import { BnbUtilsService } from '../bnb-utils.service';
import { LOGIC } from '../bolide/logic';
import { STORAGE } from '../bolide/storage';
import { FarmEthService } from '../farm/farm-eth.service';
import { TokenEthService } from '../token/token-eth.service';
import { TransactionsService } from '../transactions.service';
import { ABI_COMPTROLLER } from './abi-comptroller';
import { ORACLE } from './oracle';
import { VenusBalanceService } from './venus-balance.service';

@Injectable()
export class VenusEthService {
  private readonly logger = new Logger(VenusEthService.name);

  contractComptrollerAddress: string;

  comptrollerContract: Contract;

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly venusBalanceService: VenusBalanceService,
    private readonly tokenEthService: TokenEthService,
    private readonly bnbUtilsService: BnbUtilsService,
    private readonly farmEthService: FarmEthService,
    private readonly contractsService: ContractsService,
  ) {}

  async getComptrollerContract(web3: Web3) {
    const contractComptrollerAddress =
      await this.contractsService.getContractAddress({
        platform: PLATFORMS.VENUS,
        type: CONTRACT_TYPES.COMPTROLLER,
      });

    return new web3.eth.Contract(ABI_COMPTROLLER, contractComptrollerAddress);
  }

  async claimVenus(data: {
    uid: string;
    storageContract: ContractDto;
    logicContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }) {
    const { uid, logicContract, web3, isTransactionProdMode } = data;

    this.logger.debug({ message: 'executing claimVenus', uid });

    const venusTokens = await this.contractsService.getVenusTokens(
      logicContract.blockchainId,
    );

    const vInfo = await this.venusBalanceService.getStrategyBalances({
      logicContract,
      web3,
      venusTokens,
    });

    const vTokensToClaim = [];

    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < vInfo.venusTokens.length; ++i) {
      if (
        vInfo.venusTokens[i].vtokenBalance > 0 ||
        vInfo.venusTokens[i].borrowBalance > 0
      ) {
        vTokensToClaim.push(vInfo.venusTokens[i].vAddress);
      }
    }

    const logicContractWeb3 = new web3.eth.Contract(
      LOGIC.abi,
      logicContract.address,
    );

    const m = logicContractWeb3.methods.claimVenus(vTokensToClaim);

    await this.transactionsService.sendTransaction({
      transaction: m,
      method: 'claimVenus',
      meta: {
        vTokens: vTokensToClaim,
      },
      uid,
      func: 'claimVenus',
      web3,
      isTransactionProdMode,
    });

    this.logger.debug({
      message: 'claim venus tokens',
      vTokens: vTokensToClaim,
    });
  }

  // repay available token 'tokenAddress' on Venus
  async repayBorrowToken(data: {
    tokenAddress: string;
    repayAmount?: BigNumber;
    uid: string;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }): Promise<
    { tx: ContractSendMethod; meta: Record<string, unknown> } | undefined
  > {
    const {
      tokenAddress,
      uid,
      storageContract,
      logicContract,
      web3,
      isTransactionProdMode,
    } = data;
    let { repayAmount } = data;

    this.logger.debug({
      message: 'executing repayBorrowToken',
      tokenAddress,
      uid,
      repayAmount: repayAmount ? fromWeiToStr(repayAmount) : null,
    });

    const { amount: availableAmount } =
      await this.tokenEthService.getTokenAvailableAmount({
        tokenAddress,
        walletAddress: logicContract.address,
        storageContract,
        web3,
      });

    repayAmount = repayAmount ? repayAmount : availableAmount;

    const tokenVAddress = await this.getVToken({
      address: tokenAddress,
      storageContract,
    });

    const vTokenContract = new web3.eth.Contract(V_BEP, tokenVAddress);

    const snapshot = await vTokenContract.methods
      .getAccountSnapshot(logicContract.address)
      .call();

    this.logger.debug({
      message: 'repayBorrowToken > snapshot',
      snapshot2: snapshot[2],
      uid,
    });

    const borrowedAmount = toBN(snapshot[2]);

    let amount = BigNumber.min(availableAmount, borrowedAmount);
    amount = BigNumber.min(repayAmount, amount);

    this.logger.debug({ message: 'repayBorrowToken > amount', amount, uid });

    if (amount.gt(toBN(0))) {
      await this.checkApprovalForVToken({
        tokenAddress,
        uid,
        logicContract,
        storageContract,
        web3,
        isTransactionProdMode,
      });

      const logicContractWeb3 = new web3.eth.Contract(
        LOGIC.abi,
        logicContract.address,
      );

      const tx = logicContractWeb3.methods.repayBorrow(
        tokenVAddress,
        safeBN(amount),
      );

      const meta = {
        vToken: tokenVAddress,
        repayAmount: amount.toString(),
      };

      this.logger.debug({
        message: 'repayBorrowToken result',
        tokenAddress,
        vToken: tokenVAddress,
        repayAmount: fromWeiToStr(amount),
      });

      return { tx, meta };
    }
  }

  // returns Venus vToken by Token address
  async getVToken(data: { address: string; storageContract: ContractDto }) {
    const { address, storageContract } = data;

    const venusToken = await this.contractsService.getInnerToken({
      blockchainId: storageContract.blockchainId,
      platform: PLATFORMS.VENUS,
      baseTokenAddress: address,
    });

    if (!venusToken) {
      throw new Error(`vToken for ${address} not found`);
    }

    this.logger.debug({
      message: 'getVToken',
      address,
      vAddress: venusToken.address,
    });

    return venusToken.address;
  }

  async getBorrowBalance(data: {
    vTokenAddress: string;
    address: string;
    logicContract: ContractDto;
    web3: Web3;
  }) {
    const { vTokenAddress, address, logicContract, web3 } = data;

    const vTokenContract = new web3.eth.Contract(V_BEP, vTokenAddress);
    const snapshot = await vTokenContract.methods
      .getAccountSnapshot(logicContract.address)
      .call();

    const decimals = await this.bnbUtilsService.getDecimals(address);
    const balance = toBN(snapshot[2]);

    this.logger.debug({
      message: 'getBorrowBalance',
      vToken: await this.bnbUtilsService.getVTokenNameByAddress(vTokenAddress),
      amount: fromWeiToStr(balance, decimals),
      decimals,
    });

    return { amount: balance, decimals };
  }

  async getBorrowVsPairDiff(data: {
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
  }): Promise<{
    result: Record<string, Decimal>;
    staked: Record<string, Decimal>;
    borrowed: Record<string, Decimal>;
    wallet: Record<string, Decimal>;
  }> {
    const { logicContract, storageContract, web3 } = data;

    const cumulativeResult = {};
    const borrowed = {};
    const staked = {};
    const wallet = {};

    // borrowed balance
    const venusTokens = await this.contractsService.getVenusTokens(
      storageContract.blockchainId,
    );

    for (const venusToken of venusTokens) {
      const baseTokenAddress = (venusToken.data as InnerTokenDto)
        .baseContractAddress;

      const { amount: bBalance } = await this.getBorrowBalance({
        vTokenAddress: venusToken.address,
        address: baseTokenAddress,
        logicContract,
        web3,
      });

      const borrowBalance = fromBnToDecimal(bBalance).mul(-1);

      if (borrowBalance.toNumber() !== 0) {
        const baseToken = await this.contractsService.getTokenByAddress(
          storageContract.blockchainId,
          baseTokenAddress,
        );

        const asset = baseToken.name;

        cumulativeResult[asset] = fromWeiToDecimal(borrowBalance);
        borrowed[asset] = fromWeiToDecimal(borrowBalance);

        const { amount } = await this.tokenEthService.getTokenAvailableAmount({
          tokenAddress: await this.bnbUtilsService.getTokenAddressesByName(
            asset,
          ),
          walletAddress: logicContract.address,
          storageContract,
          web3,
        });

        // wallet balance
        const walletBalance = fromBnWeiToDecimalNormal(amount);

        cumulativeResult[asset] = cumulativeResult[asset].plus(walletBalance);
        wallet[asset] = walletBalance;
      }
    }

    for (const asset of [
      TOKEN_NAMES.BLID,
      TOKEN_NAMES.BANANA,
      TOKEN_NAMES.CAKE,
      TOKEN_NAMES.BSW,
    ]) {
      const { amount } = await this.tokenEthService.getTokenAvailableAmount({
        tokenAddress: await this.bnbUtilsService.getTokenAddressesByName(asset),
        walletAddress: logicContract.address,
        storageContract,
        web3,
      });

      if (!cumulativeResult[asset]) {
        cumulativeResult[asset] = new Decimal(0);
      }

      if (!wallet[asset]) {
        wallet[asset] = new Decimal(0);
      }

      // wallet balance
      const walletBalance = fromBnWeiToDecimalNormal(amount);

      cumulativeResult[asset] = cumulativeResult[asset].plus(walletBalance);
      wallet[asset] = wallet[asset].plus(walletBalance);
    }

    const farms = await this.contractsService.getFarms(
      storageContract.blockchainId,
    );

    for (const farm of farms) {
      const userTokenAmount = fromBnToDecimal(
        await this.farmEthService.getStakedAmount({
          farm,
          logicContract,
          storageContract,
          web3,
        }),
      );

      if (userTokenAmount.toNumber() === 0) {
        continue;
      }

      const p = await this.farmEthService.getTokensReserves({ farm, web3 });

      const totalSupply = await this.tokenEthService.getLpTokenTotalSupply({
        address: farm.lpAddress,
        web3,
      });

      const userLpPart = userTokenAmount.div(fromBnToDecimal(totalSupply));
      const userToken1Amount = fromBnWeiToDecimalNormal(p.token0).mul(
        userLpPart,
      );

      const userToken2Amount = fromBnWeiToDecimalNormal(p.token1).mul(
        userLpPart,
      );

      cumulativeResult[farm.token1] =
        cumulativeResult[farm.token1].plus(userToken1Amount);

      cumulativeResult[farm.token2] =
        cumulativeResult[farm.token2].plus(userToken2Amount);

      staked[`${farm.pair}_${farm.platform}#${farm.token1}`] = userToken1Amount;
      staked[`${farm.pair}_${farm.platform}#${farm.token2}`] = userToken2Amount;
    }

    return {
      result: cumulativeResult,
      staked,
      borrowed,
      wallet,
    };
  }

  // borrow 'borrowAmount' of token 'tokenAddress' on Venus
  async borrowToken(data: {
    tokenAddress: string;
    borrowAmount: BigNumber;
    uid: string;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }): Promise<{ tx: ContractSendMethod; meta: Record<string, unknown> }> {
    const {
      tokenAddress,
      borrowAmount,
      uid,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
    } = data;
    this.logger.debug({
      message: 'executing borrowToken',
      tokenAddress,
      borrowAmount: fromWeiToStr(borrowAmount),
      uid,
    });

    if (borrowAmount.isZero()) {
      return;
    }

    const tokenVAddress = await this.getVToken({
      address: tokenAddress,
      storageContract,
    });

    await this.checkApprovalForVToken({
      tokenAddress,
      uid,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
    });

    const digits = await this.bnbUtilsService.getDecimals(tokenAddress);

    const etherAmount = safeBN(borrowAmount);

    const logicContractWeb3 = new web3.eth.Contract(
      LOGIC.abi,
      logicContract.address,
    );

    const tx = logicContractWeb3.methods.borrow(tokenVAddress, etherAmount);

    const meta = {
      vToken: tokenVAddress,
      borrowAmount: etherAmount,
    };

    this.logger.debug({
      message: 'borrowToken result',
      tokenAddress,
      tokenVAddress,
      digits,
      etherAmount,
      vToken: tokenVAddress,
      borrowAmount: etherAmount,
    });

    return { tx, meta };
  }

  async getVTokenBalance(data: {
    vTokenAddress: string;
    logicContract: ContractDto;
    web3: Web3;
  }): Promise<BigNumber> {
    const { vTokenAddress, logicContract, web3 } = data;

    const vTokenContract = new web3.eth.Contract(V_BEP, vTokenAddress);
    const snapshot = await vTokenContract.methods
      .getAccountSnapshot(logicContract.address)
      .call();

    const result = toBN(snapshot[1])
      .mul(toBN(snapshot[3]))
      .div(toBN(10).pow(toBN(18)));

    this.logger.debug({ message: 'getVTokenBalance result', result });

    return result;
  }

  async getLendedTokenValue(
    tokenAddress: string,
    storageContract: ContractDto,
    logicContract: ContractDto,
    web3: Web3,
  ) {
    const storageContractWeb3 = new web3.eth.Contract(
      STORAGE.abi,
      storageContract.address,
    );

    const depositedAmount = toBN(
      await storageContractWeb3.methods.getTokenDeposited(tokenAddress).call(),
    );

    const storageBalance = toBN(
      await storageContractWeb3.methods.getTokenBalance(tokenAddress).call(),
    );

    const { amount: logicAmount } =
      await this.tokenEthService.getTokenAvailableAmount({
        tokenAddress,
        walletAddress: logicContract.address,
        storageContract,
        web3,
      });

    const vTokenBalance = await this.getVTokenBalance({
      vTokenAddress: await this.getVToken({
        address: tokenAddress,
        storageContract,
      }),
      logicContract,
      web3,
    });

    const lendedAmount = depositedAmount.sub(storageBalance).sub(logicAmount);
    const tokensDiff = vTokenBalance.sub(lendedAmount);

    this.logger.debug({
      message: 'getLendedTokenValue result',
      tokenAddress,
      depositedAmount: fromWeiToNum(depositedAmount),
      storageBalance: fromWeiToNum(storageBalance),
      logicAmount: fromWeiToNum(logicAmount),
      vTokenBalance: fromWeiToNum(vTokenBalance),
      lendedAmount: fromWeiToNum(lendedAmount),
      tokensDiff: fromWeiToNum(tokensDiff),
    });

    return { diff: tokensDiff, vTokenBalance, lendedAmount };
  }

  async getLendedTokens(
    storageContract: ContractDto,
    logicContract: ContractDto,
    web3: Web3,
  ) {
    this.logger.debug({ message: 'executing getLendedTokens' });
    const result = {};

    const venusTokens = await this.contractsService.getVenusTokens(
      storageContract.blockchainId,
    );

    for (const venusToken of venusTokens) {
      const baseTokenAddress = (venusToken.data as InnerTokenDto)
        .baseContractAddress;

      const baseToken = await this.contractsService.getTokenByAddress(
        storageContract.blockchainId,
        baseTokenAddress,
      );

      const res = await this.getLendedTokenValue(
        baseTokenAddress,
        storageContract,
        logicContract,
        web3,
      );

      if (res.vTokenBalance.gt(toBN(0))) {
        result[baseToken.name] = res;
      }
    }

    return result;
  }

  public async mint(
    tokenAddress: string,
    amount: BigNumber,
    uid: string,
    logicContract: ContractDto,
    storageContract: ContractDto,
    web3: Web3,
    isTransactionProdMode: boolean,
  ) {
    this.logger.debug({
      message: 'executing mint',
      tokenAddress,
      amount,
      uid,
    });

    const vTokenAddress = await this.getVToken({
      address: tokenAddress,
      storageContract,
    });

    await this.checkApprovalForVToken({
      tokenAddress,
      uid,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
    });

    this.logger.debug({
      message: 'takeTokensFromStorageAll lend',
      vTokenAddress,
      amount: fromWeiToStr(amount),
    });

    const logicContractWeb3 = new web3.eth.Contract(
      LOGIC.abi,
      logicContract.address,
    );

    const m = logicContractWeb3.methods.mint(vTokenAddress, safeBN(amount));

    await this.transactionsService.sendTransaction({
      transaction: m,
      method: 'mint',
      meta: {
        vToken: vTokenAddress,
        mintAmount: amount.toString(),
      },
      uid,
      func: 'takeTokensFromStorageAll',
      web3,
      isTransactionProdMode,
    });
  }

  public async redeemUnderlying(data: {
    tokenAddress: string;
    tokensToWithdraw: BigNumber;
    uid: string;
    storageContract: ContractDto;
    logicContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }) {
    const {
      tokenAddress,
      tokensToWithdraw,
      uid,
      storageContract,
      logicContract,
      web3,
      isTransactionProdMode,
    } = data;

    this.logger.debug({
      message: 'executing redeemUnderlying',
      token: await this.bnbUtilsService.getTokenNameByAddress({
        address: tokenAddress,
        storageContract,
      }),
      tokensToWithdraw: fromWeiToStr(tokensToWithdraw),
      uid,
    });

    const vTokenAddress = await this.getVToken({
      address: tokenAddress,
      storageContract,
    });

    await this.checkApprovalForVToken({
      tokenAddress,
      uid,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
    });

    const logicContractWeb3 = new web3.eth.Contract(
      LOGIC.abi,
      logicContract.address,
    );

    const m = logicContractWeb3.methods.redeemUnderlying(
      vTokenAddress,
      safeBN(tokensToWithdraw),
    );

    await this.transactionsService.sendTransaction({
      transaction: m,
      method: 'redeemUnderlying',
      meta: {
        vToken: vTokenAddress,
        amount: fromWeiToStr(tokensToWithdraw),
      },
      uid,
      func: 'updateStorageTokenValue',
      web3,
      isTransactionProdMode,
    });
  }

  // adds Venus vToken 'tokenAddress', if new token is available to work on Venus
  async addVTokenToContract(data: {
    tokenAddress: string;
    uid: string;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }) {
    const {
      tokenAddress,
      uid,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
    } = data;

    this.logger.debug({
      message: 'executing addVTokenToContract',
      uid,
      tokenAddress,
      logicContract: logicContract.address,
      storageContract: storageContract.address,
    });

    const bnbToken = await this.contractsService.getTokenByName(
      storageContract.blockchainId,
      TOKEN_NAMES.BNB,
    );

    const isBNB = bnbToken.address === tokenAddress;

    const tokenVAddress = await this.getVToken({
      address: tokenAddress,
      storageContract,
    });

    const logicContractWeb3 = new web3.eth.Contract(
      LOGIC.abi,
      logicContract.address,
    );

    const m = logicContractWeb3.methods.addVTokens(
      isBNB ? this.bnbUtilsService.ZERO_ADDRESS : tokenAddress,
      tokenVAddress,
    );

    await this.transactionsService.sendTransaction({
      method: 'addVTokens',
      transaction: m,
      meta: {
        token: tokenAddress,
        vToken: tokenVAddress,
      },
      func: 'addVTokenToContract',
      uid,
      web3,
      isTransactionProdMode,
    });

    this.logger.debug({
      message: 'addVToken result',
      token: tokenAddress,
      vToken: tokenVAddress,
    });
  }

  async getTotalAmountOfTokens(data: {
    logicContract: ContractDto;
    web3: Web3;
  }): Promise<number> {
    const { logicContract, web3 } = data;

    let totalAmountOfTokens = 0;

    const venusOracleAddress = await this.contractsService.getContractAddress({
      platform: PLATFORMS.VENUS,
      type: CONTRACT_TYPES.ORACLE,
    });

    const venusOracleContract = new web3.eth.Contract(
      ORACLE,
      venusOracleAddress,
    );

    const listOfTokens: string[] = await this.comptrollerContract.methods
      .getAssetsIn(logicContract.address)
      .call();

    if (listOfTokens && listOfTokens.length > 0) {
      for (const token of listOfTokens) {
        const borrowed = await this.getTokenBalance({
          tokenAddress: token,
          logicContract,
          web3,
        });
        const underlyingPrice: string = await venusOracleContract.methods
          .getUnderlyingPrice(token)
          .call();

        if (borrowed && underlyingPrice) {
          totalAmountOfTokens +=
            fromWeiToNum(borrowed) * numWei(underlyingPrice);
        }
      }
    }

    return totalAmountOfTokens;
  }

  protected async getTokenBalance(data: {
    tokenAddress: string;
    logicContract: ContractDto;
    web3: Web3;
  }): Promise<BigNumber> {
    const { tokenAddress, logicContract, web3 } = data;

    const tokenContract = new web3.eth.Contract(V_BEP, tokenAddress);
    const snapshot = await tokenContract.methods
      .getAccountSnapshot(logicContract.address)
      .call();

    return snapshot && snapshot['2'] ? toBN(snapshot['2']) : toBN(0);
  }

  private async checkApprovalForVToken(data: {
    tokenAddress;
    uid;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }) {
    const {
      tokenAddress,
      uid,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
    } = data;

    const bnbToken = await this.contractsService.getTokenByName(
      storageContract.blockchainId,
      TOKEN_NAMES.BNB,
    );

    this.logger.debug({
      message: 'checkApprovalForVToken',
      tokenAddress,
      bnbToken,
      uid,
    });

    if (tokenAddress.toUpperCase() === bnbToken.address.toUpperCase()) {
      return;
    }

    const spender = await this.getVToken({
      address: tokenAddress,
      storageContract,
    });

    const isAllowed = await this.tokenEthService.checkAllowance({
      token: tokenAddress,
      owner: logicContract.address,
      spender,
      web3,
    });

    if (!isAllowed) {
      await this.addVTokenToContract({
        tokenAddress,
        uid,
        logicContract,
        storageContract,
        web3,
        isTransactionProdMode,
      });
    }
  }
}
