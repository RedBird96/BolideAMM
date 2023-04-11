import { SWAP_NAME, TokenAmount, Trade } from '@bolide/swap-sdk';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import hre from 'hardhat';
import { LoggerModule as RollbarLoggerModule } from 'nestjs-rollbar';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';
import { toWeiBN } from 'src/common/utils/big-number-utils';
import { BlockchainEntity } from 'src/modules/blockchains/blockchain.entity';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';
import { BlockchainsSettingsService } from 'src/modules/blockchains/blockchains-settings.service';
import { BnbUtilsService } from 'src/modules/bnb/bnb-utils.service';
import { BnbWeb3Service } from 'src/modules/bnb/bnb-web3.service';
import { MulticallViewService } from 'src/modules/bnb/multicall/multicall-view.service';
import { TokenEthService } from 'src/modules/bnb/token/token-eth.service';
import { TransactionsRepository } from 'src/modules/bnb/transactions.repository';
import { TransactionsService } from 'src/modules/bnb/transactions.service';
import { PairsService } from 'src/modules/bnb/uniswap/trade-service/pairs.service';
import { TokenService } from 'src/modules/bnb/uniswap/trade-service/token.service';
import { TradeService } from 'src/modules/bnb/uniswap/trade-service/trade.service';
import { isTradeBetter } from 'src/modules/bnb/uniswap/trade-service/utils/trades';
import {
  BETTER_TRADE_LESS_HOPS_THRESHOLD,
  MAX_HOPS,
  MAX_NUM_RESULTS,
} from 'src/modules/bnb/uniswap/trade-service/utils/utils';
import { UniswapEthService } from 'src/modules/bnb/uniswap/uniswap-eth.service';
import { ContractEntity } from 'src/modules/contracts/contract.entity';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import { ContractsSerializerService } from 'src/modules/contracts/contracts-serializer.service';
import { OperationsRepository } from 'src/modules/operations/operations.repository';
import { OperationsService } from 'src/modules/operations/operations.service';
import { RuntimeKeyEntity } from 'src/modules/runtime-keys/runtime-key.entity';
import { RuntimeKeysService } from 'src/modules/runtime-keys/runtime-keys.service';
import { StrategiesRepository } from 'src/modules/strategies/strategies.repository';
import { StrategiesService } from 'src/modules/strategies/strategies.service';
import { StrategyPairRepository } from 'src/modules/strategies/strategy-pair/strategy-pair.repository';
import { SwapPathEntity } from 'src/modules/swap-paths/swap-path.entity';
import { SwapPathContractsEntity } from 'src/modules/swap-paths/swap-path-contracts.entity';
import { SwapPathsService } from 'src/modules/swap-paths/swap-paths.service';
import { SwapPathsSerializerService } from 'src/modules/swap-paths/swap-paths-serializer.service';
import { ConfigService } from 'src/shared/services/config.service';
import { SharedModule } from 'src/shared/shared.module';

import { Mocker } from '../../../utils/Mocker';
import { getRandomDbName, prepareNodeTime } from '../../common';

jest.setTimeout(1_000_000);

let contractsService: ContractsService;
let multicallService: MulticallViewService;
let strategiesService: StrategiesService;
let pairsService: PairsService;
let tokenService: TokenService;
let signers: SignerWithAddress[];
let mocker: Mocker;
let app: TestingModule;

beforeAll(async () => {
  await prepareNodeTime();
});

const blockchainId = 1;

beforeEach(async () => {
  app = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRootAsync({
        imports: [SharedModule],
        useFactory: (configService: ConfigService) => ({
          ...configService.typeOrmConfig,
          name: getRandomDbName(),
        }),
        inject: [ConfigService],
      }),
      TypeOrmModule.forFeature([
        BlockchainEntity,
        TransactionsRepository,
        RuntimeKeyEntity,
        ContractEntity,
        SwapPathEntity,
        SwapPathContractsEntity,
        StrategiesRepository,
        StrategyPairRepository,
        OperationsRepository,
      ]),
      RollbarLoggerModule.forRootAsync({
        imports: [SharedModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          accessToken: configService.rollbar.token,
          environment: configService.nodeEnv,
        }),
      }),
    ],
    controllers: [],
    providers: [
      BnbWeb3Service,
      BnbUtilsService,
      UniswapEthService,
      ConfigService,
      BlockchainsService,
      ContractsService,
      ContractsSerializerService,
      SwapPathsService,
      SwapPathsSerializerService,
      RuntimeKeysService,
      TransactionsService,
      StrategiesService,
      OperationsService,
      BlockchainsSettingsService,
      TokenEthService,
      TradeService,
      PairsService,
      MulticallViewService,
      TokenService,
    ],
  })
    .useMocker(() => ({}))
    .compile();

  contractsService = app.get<ContractsService>(ContractsService);

  signers = await hre.ethers.getSigners();

  strategiesService = app.get<StrategiesService>(StrategiesService);

  multicallService = app.get<MulticallViewService>(MulticallViewService);

  mocker = new Mocker({
    contractsService,
    strategiesService,
    multicallService,
    deployer: signers[0],
    hre,
  });
  await mocker.mock({ contracts: ['uniswap'] });

  pairsService = app.get<PairsService>(PairsService);

  tokenService = app.get<TokenService>(TokenService);
});

afterAll(async () => {
  jest.setTimeout(5000);
  await Promise.all([app.close()]);
});

describe('DEX > trade service', () => {
  test('isTradeBetter works correctly', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 1 },
      { first: 'BUSD', second: 'USDT', price: [1, 302], amount: 1 },
    ];

    await mocker.addPools(pools);

    const token1 = await tokenService.getTokenBySymbol('BNB', blockchainId);
    const token2 = await tokenService.getTokenBySymbol('BUSD', blockchainId);

    const amountStr = toWeiBN(1).toString(10);

    const currencyAmountIn = new TokenAmount(token1, amountStr);
    const currencyOut = token2;
    const swapName = SWAP_NAME.pancakeswap;

    const allowedPairs = await pairsService.useAllCommonPairs(
      currencyAmountIn?.currency,
      currencyOut,
      swapName,
      blockchainId,
      false,
    );

    const tradeList = Trade.bestTradeExactIn(
      allowedPairs,
      currencyAmountIn,
      currencyOut,
      { maxHops: MAX_HOPS, maxNumResults: MAX_NUM_RESULTS },
    ).filter(Boolean);

    const isSecondTradeBetter = isTradeBetter(
      tradeList[0],
      tradeList[1],
      BETTER_TRADE_LESS_HOPS_THRESHOLD,
    );

    expect(isSecondTradeBetter).toEqual(false);
  });

  test('isTradeBetter throw TRADES_NOT_DEFINED', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 1 },
      { first: 'BUSD', second: 'USDT', price: [1, 302], amount: 1 },
    ];

    await mocker.addPools(pools);

    expect(() =>
      isTradeBetter(undefined, undefined, BETTER_TRADE_LESS_HOPS_THRESHOLD),
    ).toThrow(
      new LogicException(ERROR_CODES.DEX_AGGREGATOR.TRADES_NOT_DEFINED),
    );
  });

  test('isTradeBetter second is undefined', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 1 },
      { first: 'BUSD', second: 'USDT', price: [1, 302], amount: 1 },
    ];

    await mocker.addPools(pools);

    const token1 = await tokenService.getTokenBySymbol('BNB', blockchainId);
    const token2 = await tokenService.getTokenBySymbol('BUSD', blockchainId);

    const amountStr = toWeiBN(1).toString(10);

    const currencyAmountIn = new TokenAmount(token1, amountStr);
    const currencyOut = token2;
    const swapName = SWAP_NAME.pancakeswap;

    const allowedPairs = await pairsService.useAllCommonPairs(
      currencyAmountIn?.currency,
      currencyOut,
      swapName,
      blockchainId,
      false,
    );

    const tradeList = Trade.bestTradeExactIn(
      allowedPairs,
      currencyAmountIn,
      currencyOut,
      { maxHops: MAX_HOPS, maxNumResults: MAX_NUM_RESULTS },
    ).find(Boolean);

    const isSecondTradeBetter = isTradeBetter(
      tradeList,
      undefined,
      BETTER_TRADE_LESS_HOPS_THRESHOLD,
    );

    expect(isSecondTradeBetter).toEqual(false);
  });

  test('isTradeBetter first is undefined', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 1 },
      { first: 'BUSD', second: 'USDT', price: [1, 302], amount: 1 },
    ];

    await mocker.addPools(pools);

    const token1 = await tokenService.getTokenBySymbol('BNB', blockchainId);
    const token2 = await tokenService.getTokenBySymbol('BUSD', blockchainId);

    const amountStr = toWeiBN(1).toString(10);

    const currencyAmountIn = new TokenAmount(token1, amountStr);
    const currencyOut = token2;
    const swapName = SWAP_NAME.pancakeswap;

    const allowedPairs = await pairsService.useAllCommonPairs(
      currencyAmountIn?.currency,
      currencyOut,
      swapName,
      blockchainId,
      false,
    );

    const tradeList = Trade.bestTradeExactIn(
      allowedPairs,
      currencyAmountIn,
      currencyOut,
      { maxHops: MAX_HOPS, maxNumResults: MAX_NUM_RESULTS },
    ).filter(Boolean);

    const isSecondTradeBetter = isTradeBetter(
      undefined,
      tradeList[1],
      BETTER_TRADE_LESS_HOPS_THRESHOLD,
    );

    expect(isSecondTradeBetter).toEqual(true);
  });

  test('isTradeBetter throw TRADES_NOT_COMPARABLE invalid tradeType', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 1 },
      { first: 'BUSD', second: 'USDT', price: [1, 302], amount: 1 },
    ];

    await mocker.addPools(pools);

    const token1 = await tokenService.getTokenBySymbol('BNB', blockchainId);
    const token2 = await tokenService.getTokenBySymbol('BUSD', blockchainId);

    const amountStr = toWeiBN(1).toString(10);

    const currencyAmountIn = new TokenAmount(token1, amountStr);
    const currencyOut = token2;
    const swapName = SWAP_NAME.pancakeswap;

    const allowedPairs = await pairsService.useAllCommonPairs(
      currencyAmountIn?.currency,
      currencyOut,
      swapName,
      blockchainId,
      false,
    );

    const tradeList = Trade.bestTradeExactIn(
      allowedPairs,
      currencyAmountIn,
      currencyOut,
      { maxHops: MAX_HOPS, maxNumResults: MAX_NUM_RESULTS },
    ).filter(Boolean);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore skip
    tradeList[0].tradeType = 1;

    expect(() =>
      isTradeBetter(
        tradeList[0],
        tradeList[1],
        BETTER_TRADE_LESS_HOPS_THRESHOLD,
      ),
    ).toThrow(
      new LogicException(ERROR_CODES.DEX_AGGREGATOR.TRADES_NOT_COMPARABLE),
    );
  });

  test('isTradeBetter throw TRADES_NOT_COMPARABLE invalid outputAmount currency', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 1 },
      { first: 'BUSD', second: 'USDT', price: [1, 302], amount: 1 },
    ];

    await mocker.addPools(pools);

    const token1 = await tokenService.getTokenBySymbol('BNB', blockchainId);
    const token2 = await tokenService.getTokenBySymbol('BUSD', blockchainId);

    const amountStr = toWeiBN(1).toString(10);

    const currencyAmountIn = new TokenAmount(token1, amountStr);
    const currencyOut = token2;
    const swapName = SWAP_NAME.pancakeswap;

    const allowedPairs = await pairsService.useAllCommonPairs(
      currencyAmountIn?.currency,
      currencyOut,
      swapName,
      blockchainId,
      false,
    );

    const tradeList = Trade.bestTradeExactIn(
      allowedPairs,
      currencyAmountIn,
      currencyOut,
      { maxHops: MAX_HOPS, maxNumResults: MAX_NUM_RESULTS },
    ).filter(Boolean);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore skip
    tradeList[0].outputAmount.currency = tradeList[1].inputAmount.currency;

    expect(() =>
      isTradeBetter(
        tradeList[0],
        tradeList[1],
        BETTER_TRADE_LESS_HOPS_THRESHOLD,
      ),
    ).toThrow(
      new LogicException(ERROR_CODES.DEX_AGGREGATOR.TRADES_NOT_COMPARABLE),
    );
  });
});
