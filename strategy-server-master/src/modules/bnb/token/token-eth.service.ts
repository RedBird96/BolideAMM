import { Injectable, Logger } from '@nestjs/common';
import type {
  ContractCallContext,
  ContractCallResults,
} from 'ethereum-multicall';
import { Multicall } from 'ethereum-multicall';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';
import {
  fromWei,
  fromWeiToStr,
  MILLION,
  toBN,
} from 'src/common/utils/big-number-utils';
import type { BigNumber } from 'src/common/utils/BigNumber';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';
import { LP_TOKEN } from 'src/modules/bnb/bolide/lp-token';
import { TOKEN_NAMES } from 'src/modules/contracts/constants/token-names';
import type { ContractEntity } from 'src/modules/contracts/contract.entity';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import type { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import type { InnerTokenDto } from 'src/modules/contracts/dto/InnerTokenDataDto';
import type Web3 from 'web3';

import { BnbUtilsService } from '../bnb-utils.service';
import { ERC_20 } from '../bolide/erc-20';
import { TransactionsService } from '../transactions.service';

@Injectable()
export class TokenEthService {
  private readonly logger = new Logger(TokenEthService.name);

  constructor(
    private readonly bnbUtilsService: BnbUtilsService,
    private readonly blockchainsService: BlockchainsService,
    private readonly contractsService: ContractsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  // returns amount of assets of tokenAddress in walletAddress
  async getTokenAvailableAmount(data: {
    tokenAddress: string;
    walletAddress: string;
    storageContract: ContractDto;
    web3: Web3;
  }) {
    const { tokenAddress, walletAddress, storageContract, web3 } = data;

    try {
      const bnbBlockchain =
        await this.blockchainsService.getBnbBlockchainEntity();

      const bnbToken = await this.contractsService.getTokenByName(
        bnbBlockchain.id,
        TOKEN_NAMES.BNB,
      );

      if (tokenAddress.toUpperCase() === bnbToken.address.toUpperCase()) {
        const amount = await web3.eth.getBalance(walletAddress);
        const result = toBN(amount);

        this.logger.debug({
          message: 'getTokenAvailableAmount bnb',
          result: fromWeiToStr(result),
        });

        return { amount: result, decimals: 18 };
      }

      const contract = new web3.eth.Contract(ERC_20.abi, tokenAddress);
      const amount = await contract.methods.balanceOf(walletAddress).call();
      const decimals = await this.bnbUtilsService.getDecimals(tokenAddress);
      const result = toBN(amount);

      const token = await this.bnbUtilsService.getTokenNameByAddress({
        address: tokenAddress,
        isStrict: false,
        storageContract,
      });

      this.logger.debug({
        message: 'getTokenAvailableAmount',
        token: token ? token : tokenAddress,
        owner: walletAddress,
        result: fromWeiToStr(result, decimals),
      });

      return { amount: result, decimals };
    } catch (error) {
      this.logger.warn({
        message: 'Error while executing getTokenAvailableAmount',
        tokenAddress,
        owner: walletAddress,
      });

      throw error;
    }
  }

  async checkAllowance(data: {
    token: string;
    owner: string;
    spender: string;
    web3: Web3;
  }): Promise<boolean> {
    const { token, owner, spender, web3 } = data;

    this.logger.debug({
      message: 'executing checkAllowance',
      token,
      owner,
      spender,
    });

    const erc20 = new web3.eth.Contract(ERC_20.abi, token);
    const res = await erc20.methods.allowance(owner, spender).call();

    const isAllowed = toBN(res).gt(MILLION);

    this.logger.debug({
      message: 'checkAllowance done',
      isAllowed,
      allowedAmount: res,
      token,
      owner,
      spender,
    });

    return isAllowed;
  }

  async approve(data: {
    owner: string;
    spender: string;
    token: string;
    amount: BigNumber;
    uid: string;
    web3: Web3;
    isTransactionProdMode: boolean;
  }): Promise<void> {
    const { token, owner, spender, amount, uid, web3, isTransactionProdMode } =
      data;

    this.logger.debug({
      message: 'approve',
      owner,
      spender,
      web3Account: web3.eth.defaultAccount,
      token,
      amount,
      uid,
    });

    const erc20 = new web3.eth.Contract(ERC_20.abi, token);
    const method = await erc20.methods.approve(spender, amount);

    return this.transactionsService.sendTransaction({
      transaction: method,
      method: 'approve',
      meta: {
        from: owner,
        token,
        amount: amount.toString(),
      },
      uid,
      func: 'approve',
      web3,
      isTransactionProdMode,
    });
  }

  async getLpTokenTotalSupply(data: {
    address: string;
    web3: Web3;
  }): Promise<BigNumber> {
    const { address, web3 } = data;

    const contract = new web3.eth.Contract(LP_TOKEN, address);
    const amount = await contract.methods.totalSupply().call();

    return toBN(amount);
  }

  async getTokensBalanceInWallet(data: {
    tokens: ContractEntity[];
    walletAddress: string;
    bnbToken: ContractEntity;
    web3: Web3;
    isUseBaseTokenAddress?: boolean;
    isUseBaseTokenName?: boolean;
    isBalanceInWei?: boolean;
  }): Promise<Record<string, BigNumber>> {
    const {
      tokens,
      isUseBaseTokenAddress,
      isUseBaseTokenName,
      walletAddress,
      bnbToken,
      web3,
      isBalanceInWei = false,
    } = data;

    const contractsCallContext: ContractCallContext[] = [];

    const multicall = new Multicall({
      web3Instance: web3,
      tryAggregate: false,
    });

    let isNeedGetBnbBalance = false;

    const results = {};

    for (const token of tokens) {
      const address = isUseBaseTokenAddress
        ? (token.data as InnerTokenDto).baseContractAddress
        : token.address;

      let tokenName = token.name;

      if (isUseBaseTokenName) {
        const baseContractId = (token.data as InnerTokenDto).baseContractId;
        const { name: baseContractName } =
          await this.contractsService.getContractById(baseContractId);

        tokenName = baseContractName;
      }

      if (address.toUpperCase() === bnbToken.address.toUpperCase()) {
        isNeedGetBnbBalance = true;
      } else {
        contractsCallContext.push({
          reference: tokenName,
          contractAddress: address,
          abi: ERC_20.abi,
          calls: [
            {
              reference: address,
              methodName: 'balanceOf',
              methodParameters: [walletAddress],
            },
          ],
        });
      }
    }

    if (isNeedGetBnbBalance) {
      try {
        const balance = await web3.eth.getBalance(walletAddress);

        const bnBalance = toBN(balance);
        const fromWeiBalance = fromWei(bnBalance);

        results[TOKEN_NAMES.BNB] = isBalanceInWei ? bnBalance : fromWeiBalance;
      } catch (error) {
        this.logger.error({
          message: 'getTokensBalanceInWallet',
          error,
          tokensLength: tokens.length,
          walletAddress,
          isUseBaseTokenAddress,
          isUseBaseTokenName,
          isBalanceInWei,
        });

        throw new LogicException(ERROR_CODES.BLOCKCHAIN_GET_BALANCE_ERROR);
      }
    }

    try {
      const contractsCallResults: ContractCallResults = await multicall.call(
        contractsCallContext,
      );

      for (const key in contractsCallResults.results) {
        const balanceOfResult =
          contractsCallResults.results[key].callsReturnContext[0];

        results[key] = toBN(balanceOfResult.returnValues[0].hex);
      }
    } catch (error) {
      this.logger.error({
        message: 'getTokensBalanceInWallet',
        error,
        tokensLength: tokens.length,
        walletAddress,
        isUseBaseTokenAddress,
        isUseBaseTokenName,
        isBalanceInWei,
      });

      throw new LogicException(ERROR_CODES.MULTICALL_RESULT_ERROR);
    }

    return results;
  }
}
