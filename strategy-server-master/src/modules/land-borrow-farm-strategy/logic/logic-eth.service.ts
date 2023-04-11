import { Injectable, Logger } from '@nestjs/common';
import { fromWeiToStr, safeBN } from 'src/common/utils/big-number-utils';
import type { BigNumber } from 'src/common/utils/BigNumber';
import { BnbUtilsService } from 'src/modules/bnb/bnb-utils.service';
import { TransactionsService } from 'src/modules/bnb/transactions.service';
import type { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import type Web3 from 'web3';

import { LOGIC } from '../../bnb/bolide/logic';

@Injectable()
export class LogicEthService {
  private readonly logger = new Logger(LogicEthService.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly bnbUtilsService: BnbUtilsService,
  ) {}

  async returnTokenToStorage(data: {
    amountWei: BigNumber;
    address: string;
    uid: string;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }): Promise<void> {
    const {
      amountWei,
      address,
      uid,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
    } = data;

    this.logger.debug({
      message: 'executing returnTokenToStorage',
      token: await this.bnbUtilsService.getTokenNameByAddress({
        address,
        storageContract,
      }),
      amount: fromWeiToStr(amountWei),
    });

    const logicContractWeb3 = new web3.eth.Contract(
      LOGIC.abi,
      logicContract.address,
    );

    const transaction = logicContractWeb3.methods.returnTokenToStorage(
      safeBN(amountWei),
      address,
    );

    await this.transactionsService.sendTransaction({
      transaction,
      method: 'returnTokenToStorage',
      meta: {
        token: address,
        amount: fromWeiToStr(amountWei),
      },
      uid,
      func: 'returnTokenToStorage',
      web3,
      isTransactionProdMode,
    });
  }

  async takeTokenFromStorage(data: {
    amount: BigNumber;
    tokenAddress: string;
    uid: string;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }): Promise<void> {
    const {
      tokenAddress,
      amount,
      uid,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
    } = data;

    this.logger.debug({
      message: 'takeTokenFromStorage',
      token: await this.bnbUtilsService.getTokenNameByAddress({
        address: tokenAddress,
        storageContract,
      }),
      balance: fromWeiToStr(amount),
    });

    const logicContractWeb3 = new web3.eth.Contract(
      LOGIC.abi,
      logicContract.address,
    );

    const transaction = logicContractWeb3.methods.takeTokenFromStorage(
      safeBN(amount),
      tokenAddress,
    );

    await this.transactionsService.sendTransaction({
      method: 'takeTokenFromStorage',
      transaction,
      meta: {
        amount: fromWeiToStr(amount),
        token: tokenAddress,
      },
      uid,
      func: 'takeTokensFromStorageAll',
      web3,
      isTransactionProdMode,
    });
  }
}
