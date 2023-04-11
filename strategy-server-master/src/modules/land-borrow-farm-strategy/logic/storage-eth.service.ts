import { Injectable, Logger } from '@nestjs/common';
import { sortBy } from 'lodash';
import { PLATFORMS } from 'src/common/constants/platforms';
import {
  fromWeiToNum,
  fromWeiToStr,
  toBN,
  toWeiBN,
} from 'src/common/utils/big-number-utils';
import type { BigNumber } from 'src/common/utils/BigNumber';
import { BnbUtilsService } from 'src/modules/bnb/bnb-utils.service';
import { UniswapEthService } from 'src/modules/bnb/uniswap/uniswap-eth.service';
import type { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import type { StrategySettingsDto } from 'src/modules/strategies/dto/StrategySettingsDto';
import type { StrategyStorageReserveDto } from 'src/modules/strategies/dto/StrategyStorageReserveDto';
import type Web3 from 'web3';

import { STORAGE } from '../../bnb/bolide/storage';

@Injectable()
export class StorageEthService {
  private readonly logger = new Logger(StorageEthService.name);

  constructor(
    private readonly bnbUtilsService: BnbUtilsService,
    private readonly uniswapEthService: UniswapEthService,
  ) {}

  async calcStorageAmountToLogic(data: {
    tokenAddress: string;
    storageContract: ContractDto;
    settings: StrategySettingsDto;
    web3: Web3;
  }): Promise<BigNumber> {
    const { tokenAddress, storageContract, settings, web3 } = data;

    const storageContractWeb3 = new web3.eth.Contract(
      STORAGE.abi,
      storageContract.address,
    );

    const balance = toBN(
      await storageContractWeb3.methods.getTokenBalance(tokenAddress).call(),
    );

    const deposited = toBN(
      await storageContractWeb3.methods.getTokenDeposited(tokenAddress).call(),
    );

    const amountToPreserve = await this.calcAmountToPreserve({
      tokenAddress,
      depositedAmount: deposited,
      maxAmountUsdToPreserveOnStorage: settings.maxAmountUsdToPreserveOnStorage,
      limitsToPreserveOnStorage: settings.limitsToPreserveOnStorage,
      web3,
    });

    const takingAmount = balance.sub(amountToPreserve);

    this.logger.debug({
      message: 'calcStorageAmountToLogic',
      amountToPreserve: fromWeiToStr(amountToPreserve),
      balance: fromWeiToStr(balance),
      deposited: fromWeiToStr(deposited),
      takingAmount: fromWeiToStr(takingAmount),
      token: await this.bnbUtilsService.getTokenNameByAddress({
        address: tokenAddress,
        storageContract,
      }),
    });

    return takingAmount.gt(toBN(0)) ? takingAmount : toBN(0);
  }

  async calcAmountToPreserve(data: {
    tokenAddress: string;
    depositedAmount: BigNumber;
    maxAmountUsdToPreserveOnStorage: number;
    limitsToPreserveOnStorage: StrategyStorageReserveDto[];
    web3: Web3;
  }): Promise<BigNumber> {
    const {
      tokenAddress,
      depositedAmount,
      maxAmountUsdToPreserveOnStorage,
      limitsToPreserveOnStorage,
      web3,
    } = data;

    const tokenPrice = fromWeiToNum(
      await this.uniswapEthService.getTokenPriceUSD({
        asset: tokenAddress,
        platform: PLATFORMS.PANCAKESWAP,
        web3,
      }),
    );

    const depositedUsd = depositedAmount.mul(toBN(tokenPrice));

    const limits = sortBy(limitsToPreserveOnStorage, ['maxAmountUsd']);

    for (const { maxAmountUsd, percentToPreserve } of limits) {
      if (depositedUsd.lt(toWeiBN(maxAmountUsd))) {
        return depositedAmount.mul(toBN(percentToPreserve));
      }
    }

    return toWeiBN(maxAmountUsdToPreserveOnStorage).div(toBN(tokenPrice));
  }
}
