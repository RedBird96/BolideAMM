import { Injectable, Logger } from '@nestjs/common';
import type {
  ContractCallContext,
  ContractCallResults,
} from 'ethereum-multicall';
import { Multicall } from 'ethereum-multicall';
import { PLATFORMS } from 'src/common/constants/platforms';
import {
  fromWei,
  fromWeiToNum,
  fromWeiToStr,
  toBN,
} from 'src/common/utils/big-number-utils';
import type { BigNumber } from 'src/common/utils/BigNumber';
import { V_BEP } from 'src/modules/bnb/bolide/v-bep';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { TOKEN_NAMES } from 'src/modules/contracts/constants/token-names';
import type { ContractEntity } from 'src/modules/contracts/contract.entity';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import type { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import type { InnerTokenDto } from 'src/modules/contracts/dto/InnerTokenDataDto';
import type Web3 from 'web3';

import { BnbUtilsService } from '../bnb-utils.service';
import { BnbWeb3Service } from '../bnb-web3.service';
import { TokenEthService } from '../token/token-eth.service';
import { VENUS_PRICE_ORACLE_ABI } from './abi-price-oracle';
import { ABI_V_BEP } from './abi-v-bep';
import type {
  FetchedVenusToken,
  FetchedVenusType,
} from './fetched-venus-token.interface';

// https://github.com/ethers-io/ethers.js/issues/1029
const ABI_COMPTROLLER = [
  {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'markets',
    outputs: [
      { internalType: 'bool', name: 'isListed', type: 'bool' },
      {
        internalType: 'uint256',
        name: 'collateralFactorMantissa',
        type: 'uint256',
      },
      { internalType: 'bool', name: 'isVenus', type: 'bool' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
];

@Injectable()
export class VenusBalanceService {
  private readonly logger = new Logger(VenusBalanceService.name);

  constructor(
    private readonly web3Service: BnbWeb3Service,
    private readonly bnbUtilsService: BnbUtilsService,
    private readonly tokenEthService: TokenEthService,
    private readonly contractsService: ContractsService,
  ) {}

  getDecimals(name: TOKEN_NAMES) {
    return name === TOKEN_NAMES.DOGE ? 8 : 18;
  }

  async getStrategyBalances(data: {
    logicContract: ContractDto;
    web3: Web3;
    venusTokens: ContractEntity[];
  }): Promise<FetchedVenusType> {
    const { logicContract, web3, venusTokens } = data;

    const results: FetchedVenusToken[] = [];

    const multicall = new Multicall({ web3Instance: web3 });

    const venusOracleAddress = await this.contractsService.getContractAddress({
      platform: PLATFORMS.VENUS,
      type: CONTRACT_TYPES.ORACLE,
    });

    const venusComptrollerAddress =
      await this.contractsService.getContractAddress({
        platform: PLATFORMS.VENUS,
        type: CONTRACT_TYPES.COMPTROLLER,
      });

    const comptrollerContractCalls = [];
    const priceOracleContractCalls = [];

    const vTokenContractsCallContexts: ContractCallContext[] = [];

    for (const token of venusTokens) {
      const { address, name } = token;

      comptrollerContractCalls.push({
        reference: 'marketsCall',
        methodName: 'markets',
        methodParameters: [address],
      });

      priceOracleContractCalls.push({
        reference: 'getUnderlyingPriceCall',
        methodName: 'getUnderlyingPrice',
        methodParameters: [address],
      });

      vTokenContractsCallContexts.push({
        reference: `vTokenContractsCallContexts${name}`,
        contractAddress: address,
        abi: ABI_V_BEP,
        calls: [
          {
            reference: 'getAccountSnapshot',
            methodName: 'getAccountSnapshot',
            methodParameters: [logicContract.address],
          },
          {
            reference: 'decimals',
            methodName: 'decimals',
            methodParameters: [],
          },
        ],
      });
    }

    const contractCallContext: ContractCallContext[] = [
      {
        reference: 'comptrollerContract',
        contractAddress: venusComptrollerAddress,
        abi: ABI_COMPTROLLER,
        calls: comptrollerContractCalls,
      },
      {
        reference: 'priceOracleContract',
        contractAddress: venusOracleAddress,
        abi: VENUS_PRICE_ORACLE_ABI,
        calls: priceOracleContractCalls,
      },

      ...vTokenContractsCallContexts,
    ];

    const contractsCallResults: ContractCallResults = await multicall.call(
      contractCallContext,
    );

    const comptrollerContractResults =
      contractsCallResults?.results?.comptrollerContract?.callsReturnContext;

    const priceOracleContractResults =
      contractsCallResults?.results?.priceOracleContract?.callsReturnContext;

    let sumSupplyUSD = 0;
    let sumBorrowUSD = 0;
    let totalBorrowLimit = 0;

    for (const [i, token] of venusTokens.entries()) {
      const { name, address } = token;

      const baseToken = await this.contractsService.getTokenByInnerToken(token);

      const asset = baseToken.name;

      const markets = comptrollerContractResults[i]?.returnValues;

      const collateralFactor = toBN(markets[1].hex);

      const price = Number.parseFloat(
        fromWeiToStr(toBN(priceOracleContractResults[i]?.returnValues[0].hex)),
      );

      const snapshot =
        contractsCallResults?.results[`vTokenContractsCallContexts${name}`]
          ?.callsReturnContext[0]?.returnValues;

      const decimals = this.getDecimals(name as TOKEN_NAMES);

      const balanceBN = toBN(snapshot[1].hex)
        .multipliedBy(toBN(snapshot[3].hex))
        .div(toBN(10).pow(toBN(decimals)));

      const balance = fromWeiToStr(balanceBN as any, decimals);
      const supplying = Number.parseFloat(balance);

      const borrowBalance = fromWeiToNum(toBN(snapshot[2].hex), decimals);

      const borrowLimit =
        supplying * price * Number.parseFloat(fromWeiToStr(collateralFactor));

      sumSupplyUSD += supplying * price;
      sumBorrowUSD += borrowBalance * price;
      totalBorrowLimit += borrowLimit;

      results.push({
        asset,
        vAddress: address,
        borrowBalance,
        vtokenBalance: supplying,
      });
    }

    const percentLimit =
      totalBorrowLimit === 0 ? 0 : (sumBorrowUSD / totalBorrowLimit) * 100;

    return {
      totalBorrowLimit,
      supplyUSD: sumSupplyUSD,
      borrowUSD: sumBorrowUSD,
      percentLimit,
      venusTokens: results,
    };
  }

  async getVTokensBalance(data: {
    venusTokens: ContractEntity[];
    web3: Web3;
    logicContract: ContractDto;
  }): Promise<Record<string, BigNumber>> {
    const { web3, logicContract, venusTokens } = data;

    const batchCalls = [];

    const batchData: Array<{
      name: string;
      address: string;
      baseTokenName: string;
    }> = [];

    const results = {};

    for (const token of venusTokens) {
      const vTokenContract = new web3.eth.Contract(V_BEP, token.address);

      const baseContractId = (token.data as InnerTokenDto).baseContractId;

      const { name: baseTokenName } =
        await this.contractsService.getContractById(baseContractId);

      batchCalls.push(
        vTokenContract.methods.getAccountSnapshot(logicContract.address),
      );

      batchData.push({
        name: token.name,
        baseTokenName,
        address: token.address,
      });
    }

    let batchResults;

    try {
      batchResults = await this.web3Service.executeWeb3Batch(web3, batchCalls);
    } catch (error) {
      this.logger.error({
        message: 'getVTokensBalance',
        error,
      });
    }

    for (const [i, batchDataItem] of batchData.entries()) {
      const decimals = await this.bnbUtilsService.getDecimals(
        batchDataItem.address,
      );

      const balance = toBN(batchResults[i][1])
        .mul(toBN(batchResults[i][3]))
        .div(toBN(10).pow(toBN(decimals)));

      results[batchDataItem.baseTokenName] = balance;
    }

    return results;
  }

  async getVenusBorrowBalancesInWallet(data: {
    venusTokens: ContractEntity[];
    logicContractAddress: string;
    web3: Web3;
  }): Promise<Record<string, BigNumber>> {
    const { venusTokens, logicContractAddress, web3 } = data;

    const tokensData: Array<{
      name: string;
      baseTokenName: string;
      baseAddress: string;
      decimals: number;
    }> = [];
    const snapshotCalls = [];

    for (const token of venusTokens) {
      const vTokenContract = new web3.eth.Contract(V_BEP, token.address);
      const baseAddress = (token.data as InnerTokenDto).baseContractAddress;
      const baseContractId = (token.data as InnerTokenDto).baseContractId;

      const { name: baseTokenName } =
        await this.contractsService.getContractById(baseContractId);

      const decimals = await this.bnbUtilsService.getDecimals(baseAddress);

      tokensData.push({
        name: token.name,
        baseTokenName,
        baseAddress,
        decimals,
      });

      snapshotCalls.push(
        vTokenContract.methods.getAccountSnapshot(logicContractAddress),
      );
    }

    let batchResults = [];

    try {
      batchResults = await this.web3Service.executeWeb3Batch(
        web3,
        snapshotCalls,
      );
    } catch (error) {
      this.logger.error({
        message: 'getVenusBorrowBalancesInWallet',
        error,
      });
    }

    const results = {};

    for (const [i, token] of tokensData.entries()) {
      const balance = fromWei(toBN(batchResults[i][2]), token.decimals);

      if (balance.eq(0)) {
        continue;
      }

      const borrowBalance = balance.mul(toBN(-1));

      results[token.baseTokenName] = borrowBalance;
    }

    return results;
  }

  async getVenusTokensBalance(data: {
    venusTokens: ContractEntity[];
    web3: Web3;
    bnbToken: ContractEntity;
    logicContractAddress: string;
  }): Promise<{
    borrowBalances: Record<string, BigNumber>;
    availableBalances: Record<string, BigNumber>;
    cumulativeBalance: Record<string, BigNumber>;
  }> {
    const { venusTokens, web3, bnbToken, logicContractAddress } = data;

    const borrowBalances = await this.getVenusBorrowBalancesInWallet({
      venusTokens,
      web3,
      logicContractAddress,
    });

    const availableBalances =
      await this.tokenEthService.getTokensBalanceInWallet({
        tokens: venusTokens,
        web3,
        bnbToken,
        walletAddress: logicContractAddress,
        isUseBaseTokenAddress: true,
        isUseBaseTokenName: true,
      });

    const cumulativeBalance = {};

    for (const key in availableBalances) {
      const borrow = borrowBalances[key] ? borrowBalances[key] : toBN('0');
      const available = availableBalances[key]
        ? availableBalances[key]
        : toBN('0');

      cumulativeBalance[key] = borrow.add(available);
    }

    return {
      borrowBalances,
      availableBalances,
      cumulativeBalance,
    };
  }
}
