import type { Interface } from '@ethersproject/abi';
import { Injectable } from '@nestjs/common';
import type { BigNumber } from 'ethers';
import { ethers } from 'ethers';
import type { FunctionFragment } from 'ethers/lib/utils';
import { ANY_PRIVATE_KEY } from 'src/common/constants/any-private-key';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import { ConfigService } from 'src/shared/services/config.service';

import type { Call } from '../uniswap/trade-service/utils/utils';
import { abi as MultiCallAbi } from './multicall-view-abi';

type MethodArg = string | number | BigNumber;
type MethodArgs = Array<MethodArg | MethodArg[]>;
type OptionalMethodInputs =
  | Array<MethodArg | MethodArg[] | undefined>
  | undefined;

const isMethodArg = (x: unknown): x is MethodArg =>
  ['string', 'number'].includes(typeof x);

const isValidMethodArgs = (x: unknown): x is MethodArgs | undefined =>
  x === undefined ||
  (Array.isArray(x) &&
    x.every(
      (xi) =>
        isMethodArg(xi) ||
        (Array.isArray(xi) && xi.every((el) => isMethodArg(el))),
    ));

@Injectable()
export class MulticallViewService {
  constructor(
    private readonly configService: ConfigService,
    private readonly contractsService: ContractsService,
  ) {}

  public async useMultipleContractSingleData(
    addresses: Array<string | undefined>,
    contractInterface: Interface,
    methodName: string,
    callInputsArr?: OptionalMethodInputs[],
  ) {
    const fragment = contractInterface.getFunction(methodName);

    let callDataArr: Array<string | undefined>;

    if (!callInputsArr) {
      const callData = fragment
        ? contractInterface.encodeFunctionData(fragment)
        : undefined;

      callDataArr = addresses.map(() => callData);
    } else {
      callDataArr = callInputsArr.map((callInputs) => {
        const callData: string | undefined =
          fragment && isValidMethodArgs(callInputs)
            ? contractInterface.encodeFunctionData(fragment, callInputs)
            : undefined;

        return callData;
      });
    }

    const calls =
      fragment &&
      addresses &&
      addresses.length > 0 &&
      callDataArr &&
      callDataArr.length > 0
        ? addresses.map<Call | undefined>((address, index) =>
            address && callDataArr[index]
              ? { address, callData: callDataArr[index] }
              : undefined,
          )
        : [];

    if (calls.length === 0) {
      return;
    }

    return this.multicallView(contractInterface, calls, fragment);
  }

  private async multicallView(
    contractInterface: Interface,
    calls: Call[],
    fragment: FunctionFragment,
  ) {
    const multicallContracts = await this.contractsService.getContracts({
      blockchainId: 1,
      type: CONTRACT_TYPES.MULTICALL,
    });

    const multicallAddress = multicallContracts[0].address;

    const provider = new ethers.providers.JsonRpcProvider(
      this.configService.networkUrls.bsc,
    );

    const wallet = new ethers.Wallet(ANY_PRIVATE_KEY, provider);

    const multi = new ethers.Contract(multicallAddress, MultiCallAbi, wallet);

    const data = calls.map((obj) => [obj.address.toLowerCase(), obj.callData]);
    const returnData = await multi.aggregate(data);

    return returnData[1].map((call: string) => {
      if (call === '0x') {
        return null;
      }

      return contractInterface.decodeFunctionResult(fragment, call);
    });
  }
}
