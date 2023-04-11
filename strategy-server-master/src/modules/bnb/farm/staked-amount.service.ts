import { Injectable, Logger } from '@nestjs/common';
import type {
  ContractCallContext,
  ContractCallResults,
} from 'ethereum-multicall';
import { Multicall } from 'ethereum-multicall';
import type { CallContext } from 'ethereum-multicall/dist/esm/models';
import { keyBy, uniqBy } from 'lodash';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';
import { toBN } from 'src/common/utils/big-number-utils';
import type { BigNumber } from 'src/common/utils/BigNumber';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import type { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import type Web3 from 'web3';

import type { Farm } from '../interfaces/farm.interface';
import { MASTER_CHEF } from './master-chef';

export interface FarmWithStakedAmount extends Farm {
  stakedAmount: BigNumber;
}

@Injectable()
export class StakedAmountService {
  private readonly logger = new Logger(StakedAmountService.name);

  constructor(private readonly contractsService: ContractsService) {}

  async getFarmsStakedAmount(data: {
    logicContract: ContractDto;
    web3: Web3;
  }): Promise<FarmWithStakedAmount[]> {
    const { logicContract, web3 } = data;

    const results: FarmWithStakedAmount[] = [];

    const farms = await this.contractsService.getFarms(
      logicContract.blockchainId,
      true,
    );

    const contractsCallContext: ContractCallContext[] = [];

    const calls: Record<string, CallContext[]> = {};

    const multicall = new Multicall({ web3Instance: web3, tryAggregate: true });

    const platforms = uniqBy(farms, 'platform');

    for (const item of farms) {
      const { platform, pid, pair } = item;

      const call: CallContext = {
        reference: pair,
        methodName: 'userInfo',
        methodParameters: [pid, logicContract.address],
      };

      if (!calls[platform]) {
        calls[platform] = [call];
      } else {
        calls[platform].push(call);
      }
    }

    for (const item of platforms) {
      const { platform } = item;

      const masterChefAddress = await this.contractsService.getContractAddress({
        blockchainId: logicContract.blockchainId,
        platform,
        type: CONTRACT_TYPES.MASTER,
      });

      contractsCallContext.push({
        reference: `${platform}`,
        contractAddress: masterChefAddress,
        abi: MASTER_CHEF,
        calls: calls[platform],
      });
    }

    try {
      const contractsCallResults: ContractCallResults = await multicall.call(
        contractsCallContext,
      );

      const farmsByPids = keyBy(
        farms,
        (item) => `${item.pair}_${item.platform}`,
      );

      for (const platformItem of platforms) {
        const itemResults = contractsCallResults.results[platformItem.platform];

        if (itemResults.callsReturnContext) {
          for (const callReturnContext of itemResults.callsReturnContext) {
            const { reference, returnValues } = callReturnContext;

            const amount = toBN(returnValues[0].hex);

            if (amount.gt(toBN(0))) {
              results.push({
                ...farmsByPids[`${reference}_${platformItem.platform}`],
                stakedAmount: amount,
              });
            }
          }
        }
      }

      return results;
    } catch (error) {
      this.logger.error({
        message: 'getFarmsStakedAmount',
        error,
      });

      throw new LogicException(ERROR_CODES.MULTICALL_RESULT_ERROR);
    }
  }
}
