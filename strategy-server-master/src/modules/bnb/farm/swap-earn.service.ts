import { Injectable, Logger } from '@nestjs/common';
import type {
  ContractCallContext,
  ContractCallResults,
} from 'ethereum-multicall';
import { Multicall } from 'ethereum-multicall';
import type { CallContext } from 'ethereum-multicall/dist/esm/models';
import { uniqBy } from 'lodash';
import { PLATFORMS } from 'src/common/constants/platforms';
import { fromWei, toBN } from 'src/common/utils/big-number-utils';
import type { BigNumber } from 'src/common/utils/BigNumber';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import type { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import type Web3 from 'web3';

import type { Farm } from '../interfaces/farm.interface';
import { MASTER_CHEF } from './master-chef';
import { abi as MASTER_CHEF_BISWAP } from './master-chef-biswap';

interface SwapEarnResultItem {
  farmName: string;
  platform: PLATFORMS;
  pair: string;
  pid: number;
  amount: BigNumber;
}

@Injectable()
export class SwapEarnService {
  private readonly logger = new Logger(SwapEarnService.name);

  constructor(private readonly contractsService: ContractsService) {}

  async calcSwapEarns(data: {
    farms: Farm[];
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
  }): Promise<
    Record<
      string,
      {
        farmName: string;
        platform: PLATFORMS;
        pair: string;
        pid: number;
        amount: BigNumber;
      }
    >
  > {
    const { farms, logicContract, web3 } = data;

    const calls: Record<string, CallContext[]> = {};

    const contractsCallContext: ContractCallContext[] = [];

    const multicall = new Multicall({ web3Instance: web3, tryAggregate: true });

    const platforms = uniqBy(farms, 'platform');

    for (const item of farms) {
      const { platform, pair, pid } = item;

      const call: CallContext = {
        reference: `${pair}_${platform}`,
        methodName:
          platform === PLATFORMS.BISWAP ? 'pendingBSW' : 'pendingCake',
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
        abi: PLATFORMS.BISWAP === platform ? MASTER_CHEF_BISWAP : MASTER_CHEF,
        calls: calls[platform],
      });
    }

    const contractsCallResults: ContractCallResults = await multicall.call(
      contractsCallContext,
    );

    const results: Record<string, SwapEarnResultItem> = {};

    for (const item of platforms) {
      const itemResults = contractsCallResults.results[item.platform];
      const { platform, pair, pid } = item;

      if (itemResults.callsReturnContext) {
        for (const callReturnContext of itemResults.callsReturnContext) {
          const { reference, returnValues } = callReturnContext;

          results[reference] = {
            farmName: reference,
            platform,
            pair,
            pid,
            amount: fromWei(toBN(returnValues[0].hex)),
          };
        }
      }
    }

    return results;
  }
}
