import { Injectable, Logger } from '@nestjs/common';
import type {
  ContractCallContext,
  ContractCallResults,
} from 'ethereum-multicall';
import { Multicall } from 'ethereum-multicall';
import { RollbarLogger } from 'nestjs-rollbar';
import { BLOCKCHAIN_NAMES } from 'src/common/constants/blockchain-names';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { PLATFORMS } from 'src/common/constants/platforms';
import { LogicException } from 'src/common/logic.exception';
import { toBN } from 'src/common/utils/big-number-utils';
import type { BigNumber } from 'src/common/utils/BigNumber';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';
import { TOKEN_NAMES } from 'src/modules/contracts/constants/token-names';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import type { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import type { InnerTokenDto } from 'src/modules/contracts/dto/InnerTokenDataDto';
import type Web3 from 'web3';

import { CONTRACT_TYPES } from '../../contracts/constants/contract-types';
import { VENUS_PRICE_ORACLE_ABI } from './abi-price-oracle';
import { ABI_V_BEP } from './abi-v-bep';

const DAYS_PER_YEAR = toBN(365);
const BLOCKS_PER_DAY = toBN(28_800);
const PRICE_DECIMAL = 36; // 10^18 * 10^18 = 10^36

// https://github.com/ethers-io/ethers.js/issues/1029
const ABI_COMPTROLLER = [
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
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'venusSpeeds',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
];

interface MulticallResultItem {
  returnValues: any[];
  decoded: boolean;
  reference: string;
  methodName: string;
  methodParameters: any[];
  success: boolean;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
enum VENUS_TOKEN_CONTRACT_METHODS {
  NAME = 'name',
  DECIMALS = 'decimals',
  GET_CASH = 'getCash',
  TOTAL_RESERVES = 'totalReserves',
  RESERVE_FACTOR_MANTISSA = 'reserveFactorMantissa',
  BORROW_RATE_PER_BLOCK = 'borrowRatePerBlock',
  SUPPLY_RATE_PER_BLOCK = 'supplyRatePerBlock',
  EXCHANGE_RATE_CURRENT = 'exchangeRateCurrent',
  TOTAL_SUPPLY = 'totalSupply',
  TOTAL_BORROWS_CURRENT = 'totalBorrowsCurrent',
}

// eslint-disable-next-line @typescript-eslint/naming-convention
enum COMPTROLLER_CONTRACT_METHODS {
  VENUS_SPEEDS = 'venusSpeeds',
  VENUS_BORROW_STATE = 'venusBorrowState',
  VENUS_SUPPLY_STATE = 'venusSupplyState',
  MARKETS = 'markets',
}

// eslint-disable-next-line @typescript-eslint/naming-convention
enum PRICE_ORACLE_CONTRACT_METHODS {
  GET_UNDERLYING_PRICE = 'getUnderlyingPrice',
}

// eslint-disable-next-line @typescript-eslint/naming-convention
enum UNDERLYING_CONTRACT_METHODS {
  SYMBOL = 'symbol',
  NAME = 'name',
  DECIMALS = 'decimals',
}

export interface ComputeApyDataItem {
  supplierDailyVenus: string;
  venusBorrowIndex: string;
  venusSupplyIndex: string;
  collateralFactor: BigNumber;
  vTokenName: string;
  vTokenDecimals: number;
  totalReserves: string;
  reserveFactor: string;
  borrowRatePerBlock: string;
  supplyRatePerBlock: string;
  borrowRate: BigNumber;
  supplyRate: BigNumber;
  underlyingAddress: string;
  underlyingSymbol: string;
  underlyingName: string;
  underlyingDecimal: string;
  underlyingPrice: string;
  totalSupply2: BigNumber;
  totalSupply: string;
  totalSupplyUsd: BigNumber;
  totalBorrows: string;
  totalBorrows2: BigNumber;
  totalBorrowsUsd: BigNumber;
  tokenPrice: BigNumber;
  liquidity: BigNumber;
  vTokenAddress: string;
  address: string;
  borrowApy: BigNumber;
  supplyApy: BigNumber;
  borrowVenusApy: BigNumber;
  supplyVenusApy: BigNumber;
  platformSymbol: string;
}

@Injectable()
export class VenusComputeApyService {
  private readonly logger = new Logger(VenusComputeApyService.name);

  constructor(
    private readonly contractsService: ContractsService,
    private readonly blockchainsService: BlockchainsService,
    private readonly rollbarLogger: RollbarLogger,
  ) {}

  logError(data: {
    error?: Error;
    item: MulticallResultItem;
    contractName: string;
  }) {
    const {
      error = new LogicException(ERROR_CODES.MULTICALL_RESULT_ERROR),
      item,
      contractName,
    } = data;

    this.logger.warn({
      error,
      message: 'VenusComputeApyService',
      item,
      contractName,
    });

    this.rollbarLogger.error(
      'VenusComputeApyService error',
      error,
      item,
      contractName,
    );
  }

  async getAllVenusTokensData(data: {
    web3: Web3;
  }): Promise<ComputeApyDataItem[]> {
    const { web3 } = data;

    const bnbBlockchain = await this.blockchainsService.getBlockchainByName(
      BLOCKCHAIN_NAMES.BNB,
    );

    const venusTokens = await this.contractsService.getVenusTokens(
      bnbBlockchain.id,
    );

    const vXVSToken = await this.contractsService.getInnerToken({
      blockchainId: bnbBlockchain.id,
      platform: PLATFORMS.VENUS,
      name: 'vXVS',
    });

    const promises: Array<Promise<ComputeApyDataItem>> = [];

    for (const vToken of venusTokens) {
      promises.push(
        this.getComputeApyForVToken({
          web3,
          vToken,
          vXVSToken,
        }),
      );
    }

    return Promise.all(promises);
  }

  async getComputeApyForVToken(data: {
    web3: Web3;
    vToken: ContractDto;
    vXVSToken: ContractDto;
  }): Promise<ComputeApyDataItem> {
    const { web3, vToken, vXVSToken } = data;

    const contractComptrollerAddress =
      await this.contractsService.getContractAddress({
        platform: PLATFORMS.VENUS,
        type: CONTRACT_TYPES.COMPTROLLER,
      });

    const venusOracleAddress = await this.contractsService.getContractAddress({
      platform: PLATFORMS.VENUS,
      type: CONTRACT_TYPES.ORACLE,
    });

    const vTokenAddress = vToken.address;

    const underlyingAddress =
      vToken.name !== `v${TOKEN_NAMES.BNB}`
        ? (vToken.data as InnerTokenDto).baseContractAddress
        : vToken.address;

    let venusSpeeds;
    let vTokenName;
    let vTokenDecimals;
    let cash;
    let totalReserves;
    let reserveFactor;
    let borrowRatePerBlock;
    let supplyRatePerBlock;
    let exchangeRate;
    let totalSupply;
    let totalBorrows;
    let underlyingPrice;
    let underlyingSymbol;
    let underlyingName;
    let underlyingDecimal;
    let xvsPrice;
    let venusBorrowIndex;
    let venusSupplyIndex;
    let collateralFactor;

    const multicall = new Multicall({ web3Instance: web3, tryAggregate: true });

    const vTokenCalls = [];
    const comptrollerContractCalls = [];
    const priceOracleContractCalls = [];
    const underlyingContractCalls = [];

    for (const key in VENUS_TOKEN_CONTRACT_METHODS) {
      vTokenCalls.push({
        reference: `${VENUS_TOKEN_CONTRACT_METHODS[key]}Call`,
        methodName: VENUS_TOKEN_CONTRACT_METHODS[key],
        methodParameters: [],
      });
    }

    for (const key in COMPTROLLER_CONTRACT_METHODS) {
      comptrollerContractCalls.push({
        reference: `${COMPTROLLER_CONTRACT_METHODS[key]}Call$`,
        methodName: COMPTROLLER_CONTRACT_METHODS[key],
        methodParameters: [vTokenAddress],
      });
    }

    for (const key in UNDERLYING_CONTRACT_METHODS) {
      underlyingContractCalls.push({
        reference: `${UNDERLYING_CONTRACT_METHODS[key]}Call`,
        methodName: UNDERLYING_CONTRACT_METHODS[key],
        methodParameters: [],
      });
    }

    priceOracleContractCalls.push(
      {
        reference: `${PRICE_ORACLE_CONTRACT_METHODS.GET_UNDERLYING_PRICE}VtokenCall`,
        methodName: PRICE_ORACLE_CONTRACT_METHODS.GET_UNDERLYING_PRICE,
        methodParameters: [vTokenAddress],
      },
      {
        reference: `${PRICE_ORACLE_CONTRACT_METHODS.GET_UNDERLYING_PRICE}vXVSCall`,
        methodName: PRICE_ORACLE_CONTRACT_METHODS.GET_UNDERLYING_PRICE,
        methodParameters: [vXVSToken.address],
      },
    );

    const contractCallContext: ContractCallContext[] = [
      {
        reference: 'vTokenContract',
        contractAddress: vToken.address,
        abi: ABI_V_BEP,
        calls: vTokenCalls,
      },
      {
        reference: 'comptrollerContract',
        contractAddress: contractComptrollerAddress,
        abi: ABI_COMPTROLLER,
        calls: comptrollerContractCalls,
      },
      {
        reference: 'priceOracleContract',
        contractAddress: venusOracleAddress,
        abi: VENUS_PRICE_ORACLE_ABI,
        calls: priceOracleContractCalls,
      },
      {
        reference: 'underlyingContract',
        contractAddress: underlyingAddress,
        abi: ABI_V_BEP,
        calls: underlyingContractCalls,
      },
    ];

    const results: ContractCallResults = await multicall.call(
      contractCallContext,
    );

    const vTokenContractCallsResults =
      results?.results?.vTokenContract?.callsReturnContext;

    const comptrollerContractResults =
      results?.results?.comptrollerContract?.callsReturnContext;

    const priceOracleContractResults =
      results?.results?.priceOracleContract?.callsReturnContext;

    const underlyingContractResults =
      results?.results?.underlyingContract?.callsReturnContext;

    if (underlyingContractResults && underlyingContractResults.length > 0) {
      for (const item of underlyingContractResults) {
        const {
          methodName,
          returnValues,
          success: isSuccess,
        } = item as MulticallResultItem;

        if (!isSuccess) {
          this.logError({
            item,
            contractName: 'priceOracleContract',
          });

          continue;
        }

        switch (methodName) {
          case UNDERLYING_CONTRACT_METHODS.SYMBOL:
            underlyingSymbol = returnValues[0];
            break;
          case UNDERLYING_CONTRACT_METHODS.NAME:
            underlyingName = returnValues[0];
            break;
          case UNDERLYING_CONTRACT_METHODS.DECIMALS:
            underlyingDecimal = returnValues[0];
            break;
        }
      }
    }

    if (priceOracleContractResults && priceOracleContractResults.length > 0) {
      for (const item of priceOracleContractResults) {
        const {
          reference,
          returnValues,
          success: isSuccess,
        } = item as MulticallResultItem;

        if (!isSuccess) {
          this.logError({
            item,
            contractName: 'priceOracleContract',
          });

          continue;
        }

        switch (reference) {
          case `${PRICE_ORACLE_CONTRACT_METHODS.GET_UNDERLYING_PRICE}VtokenCall`:
            underlyingPrice = toBN(returnValues[0]?.hex);
            break;
          case `${PRICE_ORACLE_CONTRACT_METHODS.GET_UNDERLYING_PRICE}vXVSCall`:
            xvsPrice = toBN(returnValues[0]?.hex);
            break;
        }
      }
    }

    if (comptrollerContractResults && comptrollerContractResults.length > 0) {
      for (const item of comptrollerContractResults) {
        const {
          methodName,
          returnValues,
          success: isSuccess,
        } = item as MulticallResultItem;

        if (!isSuccess) {
          this.logError({
            item,
            contractName: 'priceOracleContract',
          });

          continue;
        }

        switch (methodName) {
          case COMPTROLLER_CONTRACT_METHODS.VENUS_SPEEDS:
            venusSpeeds = toBN(returnValues[0]?.hex);
            break;
          case COMPTROLLER_CONTRACT_METHODS.VENUS_BORROW_STATE:
            venusBorrowIndex = toBN(returnValues[0]?.hex).toString(10);
            break;
          case COMPTROLLER_CONTRACT_METHODS.VENUS_SUPPLY_STATE:
            venusSupplyIndex = toBN(returnValues[0]?.hex).toString(10);
            break;
          case COMPTROLLER_CONTRACT_METHODS.MARKETS:
            collateralFactor = toBN(returnValues[1]?.hex);
            break;
        }
      }
    }

    if (vTokenContractCallsResults && vTokenContractCallsResults.length > 0) {
      for (const item of vTokenContractCallsResults) {
        const {
          methodName,
          returnValues,
          success: isSuccess,
        } = item as MulticallResultItem;

        if (!isSuccess) {
          this.logError({
            item,
            contractName: 'priceOracleContract',
          });

          continue;
        }

        switch (methodName) {
          case VENUS_TOKEN_CONTRACT_METHODS.NAME:
            vTokenName = returnValues[0];
            break;
          case VENUS_TOKEN_CONTRACT_METHODS.DECIMALS:
            vTokenDecimals = returnValues[0];
            break;
          case VENUS_TOKEN_CONTRACT_METHODS.GET_CASH:
            cash = toBN(returnValues[0]?.hex);
            break;
          case VENUS_TOKEN_CONTRACT_METHODS.TOTAL_RESERVES:
            totalReserves = toBN(returnValues[0]?.hex).toString(10);
            break;
          case VENUS_TOKEN_CONTRACT_METHODS.RESERVE_FACTOR_MANTISSA:
            reserveFactor = toBN(returnValues[0]?.hex).toString(10);
            break;
          case VENUS_TOKEN_CONTRACT_METHODS.BORROW_RATE_PER_BLOCK:
            borrowRatePerBlock = toBN(returnValues[0]?.hex);
            break;
          case VENUS_TOKEN_CONTRACT_METHODS.SUPPLY_RATE_PER_BLOCK:
            supplyRatePerBlock = toBN(returnValues[0]?.hex);
            break;
          case VENUS_TOKEN_CONTRACT_METHODS.EXCHANGE_RATE_CURRENT:
            exchangeRate = toBN(returnValues[0]?.hex);
            break;
          case VENUS_TOKEN_CONTRACT_METHODS.TOTAL_SUPPLY:
            totalSupply = toBN(returnValues[0]?.hex);
            break;
          case VENUS_TOKEN_CONTRACT_METHODS.TOTAL_BORROWS_CURRENT:
            totalBorrows = toBN(returnValues[0]?.hex);
            break;
        }
      }
    }

    try {
      const borrowerDailyVenus = venusSpeeds
        .multipliedBy(BLOCKS_PER_DAY)
        .toString(10);

      const supplierDailyVenus = borrowerDailyVenus;

      const decimals =
        vToken.name !== `v${TOKEN_NAMES.BNB}` ? underlyingDecimal : 18;

      const borrowRate = borrowRatePerBlock
        .div(toBN(1e18))
        .multipliedBy(BLOCKS_PER_DAY)
        .dp(18, 1);

      const borrowApy = borrowRate
        .plus(toBN(1))
        .pow(DAYS_PER_YEAR.minus(toBN(1)))
        .minus(toBN(1))
        .multipliedBy(toBN(-100))
        .dp(18, 1);

      const supplyRate = supplyRatePerBlock
        .div(toBN(1e18))
        .multipliedBy(BLOCKS_PER_DAY)
        .dp(18, 1);

      const supplyApy = supplyRate
        .plus(toBN(1))
        .pow(DAYS_PER_YEAR.minus(toBN(1)))
        .minus(toBN(1))
        .multipliedBy(toBN(100))
        .dp(18, 1);

      const totalSupply2 = totalSupply.div(
        toBN(10).exponentiatedBy(vTokenDecimals),
      );

      const totalSupplyUsd = totalSupply
        .multipliedBy(exchangeRate)
        .multipliedBy(underlyingPrice)
        .div(toBN(10).exponentiatedBy(toBN(PRICE_DECIMAL)))
        .div(toBN(10).exponentiatedBy(toBN(18)))
        .dp(18, 1);

      const totalBorrows2 = totalBorrows.div(
        toBN(10).exponentiatedBy(decimals),
      );

      const totalBorrowsUsd = totalBorrows
        .multipliedBy(underlyingPrice)
        .div(toBN(10).exponentiatedBy(toBN(PRICE_DECIMAL)))
        .dp(18, 1);

      const priceDecimal = toBN(10).exponentiatedBy(
        toBN(PRICE_DECIMAL).sub(decimals),
      );

      const tokenPrice = underlyingPrice.div(priceDecimal);

      const liquidity = cash
        .div(toBN(10).pow(decimals))
        .multipliedBy(tokenPrice)
        .dp(18, 1);

      const speedPerYear = venusSpeeds
        .multipliedBy(BLOCKS_PER_DAY)
        .multipliedBy(DAYS_PER_YEAR);

      const totalXVSAmoutPerYearUSD = speedPerYear
        .multipliedBy(xvsPrice)
        .div(toBN(10).exponentiatedBy(toBN(PRICE_DECIMAL)))
        .dp(18, 1);

      const borrowVenusApy = totalXVSAmoutPerYearUSD
        .div(totalBorrowsUsd)
        .multipliedBy(toBN(100));

      const supplyVenusApy = totalXVSAmoutPerYearUSD
        .div(totalSupplyUsd)
        .multipliedBy(toBN(100));

      return {
        supplierDailyVenus,
        venusBorrowIndex,
        venusSupplyIndex,
        collateralFactor,
        vTokenName,
        vTokenDecimals,
        totalReserves,
        reserveFactor,
        borrowRatePerBlock: borrowRatePerBlock.toString(10),
        supplyRatePerBlock: supplyRatePerBlock.toString(10),
        borrowRate,
        borrowApy,
        supplyApy,
        borrowVenusApy,
        supplyVenusApy,
        underlyingAddress,
        underlyingSymbol,
        underlyingName,
        underlyingDecimal: decimals,
        underlyingPrice: underlyingPrice.toString(10),
        totalSupply: totalSupply.toString(10),
        totalSupply2,
        totalSupplyUsd,
        totalBorrows: totalBorrows.toString(10),
        totalBorrows2,
        totalBorrowsUsd,
        tokenPrice,
        liquidity,
        supplyRate,
        vTokenAddress,
        address: (vToken.data as InnerTokenDto).baseContractAddress,
        platformSymbol: vToken.name,
      };
    } catch (error) {
      this.logger.error({
        message: 'getComputeApyForVToken -> calc',
        error,
      });

      throw new LogicException(ERROR_CODES.VENUS_CALC_COMPUTE_APY_ERROR);
    }
  }
}
