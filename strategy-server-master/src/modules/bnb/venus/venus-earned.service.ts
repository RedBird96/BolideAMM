import { Injectable, Logger } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import type {
  ContractCallContext,
  ContractCallResults,
} from 'ethereum-multicall';
import { Multicall } from 'ethereum-multicall';
import type { CallContext } from 'ethereum-multicall/dist/esm/models';
import { keyBy } from 'lodash';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';
import { toBN } from 'src/common/utils/big-number-utils';
import type Web3 from 'web3';

import { PLATFORMS } from '../../../common/constants/platforms';
import { CONTRACT_TYPES } from '../../contracts/constants/contract-types';
import { ContractsService } from '../../contracts/contracts.service';
import { ABI_V_BEP } from './abi-v-bep';
import { ABI_V_BNB } from './abi-v-bnb';
import { CONTRACT_VBEP_ADDRESS } from './venus-utils';

// https://github.com/ethers-io/ethers.js/issues/1029
const ABI_COMPTROLLER = [
  {
    constant: true,
    inputs: [],
    name: 'venusInitialIndex',
    outputs: [{ internalType: 'uint224', name: '', type: 'uint224' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'venusAccrued',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'venusSupplyState',
    outputs: [
      { internalType: 'uint224', name: 'index', type: 'uint224' },
      { internalType: 'uint32', name: 'block', type: 'uint32' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'venusSupplierIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'venusBorrowState',
    outputs: [
      { internalType: 'uint224', name: 'index', type: 'uint224' },
      { internalType: 'uint32', name: 'block', type: 'uint32' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'venusBorrowerIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
];

@Injectable()
export class VenusEarnedService {
  private readonly logger = new Logger(VenusEarnedService.name);

  constructor(private readonly contractsService: ContractsService) {}

  async getVenusEarned(data: {
    walletAddress: string;
    web3: Web3;
  }): Promise<BigNumber> {
    const { walletAddress, web3 } = data;

    const contractComptrollerAddress =
      await this.contractsService.getContractAddress({
        platform: PLATFORMS.VENUS,
        type: CONTRACT_TYPES.COMPTROLLER,
      });

    let venusEarned = new BigNumber('0');

    const contractsCallContext: ContractCallContext[] = [];

    const initialAndAccruedCalls: CallContext[] = [
      {
        reference: 'venusInitialIndex',
        methodName: 'venusInitialIndex',
        methodParameters: [],
      },
      {
        reference: 'venusAccrued',
        methodName: 'venusAccrued',
        methodParameters: [walletAddress],
      },
    ];

    const getVenusSupplyStateMapCalls: CallContext[] = [];
    const getVenusSupplierIndexMapCalls: CallContext[] = [];
    const getVenusBalanceOfMapCalls: CallContext[] = [];
    const getVenusBorrowStateMapCalls: CallContext[] = [];
    const getVenusBorrowerIndexMapCalls: CallContext[] = [];
    const getBorrowBalanceStoredMapCalls: CallContext[] = [];
    const getBorrowIndexMapCalls: CallContext[] = [];

    const multicall = new Multicall({ web3Instance: web3, tryAggregate: true });

    for (const key in CONTRACT_VBEP_ADDRESS) {
      const item = CONTRACT_VBEP_ADDRESS[key];

      const getVenusSupplyStateMapCall: CallContext = {
        reference: `${item.address}`,
        methodName: 'venusSupplyState',
        methodParameters: [item.address],
      };

      const getVenusSupplierIndexMapCall: CallContext = {
        reference: `${item.address}`,
        methodName: 'venusSupplierIndex',
        methodParameters: [item.address, walletAddress],
      };

      const getVenusBorrowStateMapCall: CallContext = {
        reference: `${item.address}`,
        methodName: 'venusBorrowState',
        methodParameters: [item.address],
      };

      const getVenusBorrowerIndexMapCall: CallContext = {
        reference: `${item.address}`,
        methodName: 'venusBorrowerIndex',
        methodParameters: [item.address, walletAddress],
      };

      contractsCallContext.push({
        reference: `vBepContract${item.address}`,
        contractAddress: item.address,
        abi: item.id === 'bnb' ? ABI_V_BNB : ABI_V_BEP,
        calls: [
          {
            reference: 'balanceOf',
            methodName: 'balanceOf',
            methodParameters: [walletAddress],
          },
          {
            reference: 'borrowBalanceStored',
            methodName: 'borrowBalanceStored',
            methodParameters: [walletAddress],
          },
          {
            reference: 'borrowIndex',
            methodName: 'borrowIndex',
            methodParameters: [],
          },
        ],
      });

      getVenusSupplyStateMapCalls.push(getVenusSupplyStateMapCall);
      getVenusSupplierIndexMapCalls.push(getVenusSupplierIndexMapCall);
      getVenusBorrowStateMapCalls.push(getVenusBorrowStateMapCall);
      getVenusBorrowerIndexMapCalls.push(getVenusBorrowerIndexMapCall);
    }

    contractsCallContext.push(
      {
        reference: 'initialAndAccruedCalls',
        contractAddress: contractComptrollerAddress,
        abi: ABI_COMPTROLLER,
        calls: initialAndAccruedCalls,
      },
      {
        reference: 'getVenusSupplyStateMapCalls',
        contractAddress: contractComptrollerAddress,
        abi: ABI_COMPTROLLER,
        calls: getVenusSupplyStateMapCalls,
      },
      {
        reference: 'getVenusSupplierIndexMapCalls',
        contractAddress: contractComptrollerAddress,
        abi: ABI_COMPTROLLER,
        calls: getVenusSupplierIndexMapCalls,
      },
      {
        reference: 'getVenusBalanceOfMapCalls',
        contractAddress: contractComptrollerAddress,
        abi: ABI_COMPTROLLER,
        calls: getVenusBalanceOfMapCalls,
      },
      {
        reference: 'getVenusBorrowStateMapCalls',
        contractAddress: contractComptrollerAddress,
        abi: ABI_COMPTROLLER,
        calls: getVenusBorrowStateMapCalls,
      },
      {
        reference: 'getVenusBorrowerIndexMapCalls',
        contractAddress: contractComptrollerAddress,
        abi: ABI_COMPTROLLER,
        calls: getVenusBorrowerIndexMapCalls,
      },
      {
        reference: 'getBorrowBalanceStoredMapCalls',
        contractAddress: contractComptrollerAddress,
        abi: ABI_COMPTROLLER,
        calls: getBorrowBalanceStoredMapCalls,
      },
      {
        reference: 'getBorrowIndexMapCalls',
        contractAddress: contractComptrollerAddress,
        abi: ABI_COMPTROLLER,
        calls: getBorrowIndexMapCalls,
      },
    );

    try {
      const contractsCallResults: ContractCallResults = await multicall.call(
        contractsCallContext,
      );

      const initialAndAccruedCallsResults =
        contractsCallResults.results.initialAndAccruedCalls.callsReturnContext;

      const getVenusSupplyStateMapCallsResults =
        contractsCallResults.results.getVenusSupplyStateMapCalls
          .callsReturnContext;
      const groupedVenSupStateResults = keyBy(
        getVenusSupplyStateMapCallsResults,
        'reference',
      );

      const getVenusSupplierIndexMapCallsResults =
        contractsCallResults.results.getVenusSupplierIndexMapCalls
          .callsReturnContext;
      const groupedVenSupIndexResults = keyBy(
        getVenusSupplierIndexMapCallsResults,
        'reference',
      );

      const getVenusBorrowStateMapCallsResults =
        contractsCallResults.results.getVenusBorrowStateMapCalls
          .callsReturnContext;
      const groupedVenBorStateResults = keyBy(
        getVenusBorrowStateMapCallsResults,
        'reference',
      );

      const getVenusBorrowerIndexMapCallsResults =
        contractsCallResults.results.getVenusBorrowerIndexMapCalls
          .callsReturnContext;
      const groupedVenBorIndexResults = keyBy(
        getVenusBorrowerIndexMapCallsResults,
        'reference',
      );

      const venusInitialIndex = toBN(
        initialAndAccruedCallsResults[0].returnValues[0].hex,
      );

      const venusAccrued = toBN(
        initialAndAccruedCallsResults[1].returnValues[0].hex,
      );

      for (const key in CONTRACT_VBEP_ADDRESS) {
        const item = CONTRACT_VBEP_ADDRESS[key];
        const { address } = item;

        const vBepResults =
          contractsCallResults.results[`vBepContract${address}`];

        const balanceOf = toBN(
          vBepResults.callsReturnContext[0].returnValues[0].hex,
        );
        const borrowBalanceStored = toBN(
          vBepResults.callsReturnContext[1].returnValues[0].hex,
        );
        const borrowIndex = toBN(
          vBepResults.callsReturnContext[2].returnValues[0].hex,
        );

        const supplyIndex = toBN(
          groupedVenSupStateResults[address].returnValues[0].hex,
        );

        let supplierIndex = toBN(
          groupedVenSupIndexResults[address].returnValues[0].hex,
        );

        const supplierTokens = balanceOf;

        const borrowState = toBN(
          groupedVenBorStateResults[address].returnValues[0].hex,
        );

        const borrowerIndex = toBN(
          groupedVenBorIndexResults[address].returnValues[0].hex,
        );

        if (Number(supplierIndex) === 0 && Number(supplyIndex) > 0) {
          supplierIndex = venusInitialIndex;
        }

        let deltaIndex = supplyIndex.minus(supplierIndex);

        const supplierDelta = supplierTokens
          .multipliedBy(deltaIndex)
          .dividedBy(toBN(1e36));

        venusEarned = venusEarned.plus(supplierDelta);

        if (Number(borrowerIndex) > 0) {
          deltaIndex = borrowState.minus(borrowerIndex);
          const borrowerAmount = borrowBalanceStored
            .multipliedBy(toBN(1e18))
            .div(borrowIndex);

          const borrowerDelta = borrowerAmount
            .times(deltaIndex)
            .div(toBN(1e36));

          venusEarned = venusEarned.plus(borrowerDelta);
        }
      }

      venusEarned = venusEarned.plus(venusAccrued).div(toBN(1e18));

      this.logger.debug({
        message: 'getVenusEarned result',
        result: venusEarned,
      });

      return venusEarned;
    } catch (error) {
      this.logger.error({
        message: 'getFarmsStakedAmount',
        error,
      });

      throw new LogicException(ERROR_CODES.MULTICALL_RESULT_ERROR);
    }
  }
}
