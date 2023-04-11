import type { Currency } from '@bolide/swap-sdk';
import { SWAP_NAME } from '@bolide/swap-sdk';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import hre, { ethers } from 'hardhat';
import { LoggerModule as RollbarLoggerModule } from 'nestjs-rollbar';
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
import { UniswapEthService } from 'src/modules/bnb/uniswap/uniswap-eth.service';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
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

const blockchainId = 1;

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

describe('DEX > pairs service', () => {
  test('getAllPairCombinations works correctly', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
    ];

    await mocker.addPools(pools);

    const SYMBOLS = ['BUSD', 'BNB', 'USDT'];

    const TOKENS = await Promise.all(
      SYMBOLS.map((symbol) =>
        tokenService.getTokenBySymbol(symbol, blockchainId),
      ),
    );

    const result = pairsService.getAllPairCombinations(
      TOKENS[0],
      TOKENS[1],
      TOKENS,
      [
        [TOKENS[0], TOKENS[1]],
        [TOKENS[1], TOKENS[0]],
        [TOKENS[1], TOKENS[2]],
        [TOKENS[2], TOKENS[1]],
      ],
    );
    const expected = [
      [TOKENS[0], TOKENS[1]],
      [TOKENS[0], TOKENS[1]],
      [TOKENS[0], TOKENS[2]],
      [TOKENS[1], TOKENS[0]],
      [TOKENS[1], TOKENS[2]],
      [TOKENS[0], TOKENS[1]],
      [TOKENS[1], TOKENS[0]],
      [TOKENS[1], TOKENS[2]],
      [TOKENS[2], TOKENS[1]],
    ];
    expect(result).toStrictEqual(expected);
  });

  test('getBases works correctly', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
    ];

    await mocker.addPools(pools);

    const SYMBOLS = ['BUSD', 'BNB', 'USDT', 'USDC', 'BTC', 'ETH'];

    const TOKENS = await Promise.all(
      SYMBOLS.map((symbol) =>
        tokenService.getTokenBySymbol(symbol, blockchainId),
      ),
    );

    const result = await pairsService.getBases({
      tokenA: TOKENS[0],
      tokenB: TOKENS[1],
      blockchainId,
      isLightMode: false,
    });

    const expected = [
      TOKENS[0],
      TOKENS[2],
      TOKENS[3],
      TOKENS[4],
      TOKENS[1],
      TOKENS[5],
    ];
    expect(result).toStrictEqual(expected);
  });

  test('getPairs works correctly', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
    ];

    await mocker.addPools(pools);

    const SYMBOLS = ['BUSD', 'BNB', 'USDT', 'USDC', 'BTC', 'ETH'];

    const TOKENS = await Promise.all(
      SYMBOLS.map((symbol) =>
        tokenService.getTokenBySymbol(symbol, blockchainId),
      ),
    );

    const currencies = [
      [TOKENS[0], TOKENS[1]],
      [TOKENS[1], TOKENS[0]],
    ] as Array<[Currency | undefined, Currency | undefined]>;

    const result = await pairsService.getPairs(
      currencies,
      SWAP_NAME.pancakeswap,
      blockchainId,
    );

    const pancakeRouter = await ethers.getContractFactory('UniswapV2Router02');
    const routerList = await contractsService.getContracts({
      type: CONTRACT_TYPES.ROUTER,
    });
    const pancakeSwapRouter = routerList.find(
      (router) => router.platform === 'PANCAKESWAP',
    );

    const pancakeSwap = pancakeRouter.attach(pancakeSwapRouter.address);
    const factoryAdd = await pancakeSwap.factory();
    const pancakeFactory = await ethers.getContractFactory('UniswapV2Factory');
    const factory = pancakeFactory.attach(factoryAdd);
    const pairAddress = await factory.getPair(
      TOKENS[0].address,
      TOKENS[1].address,
    );

    const expected = [
      [
        2,
        {
          liquidityToken: {
            decimals: 18,
            symbol: 'Cake-LP',
            name: 'Pancake LPs',
            chainId: 56,
            address: pairAddress,
          },
          tokenAmounts: [
            {
              numerator: [528_613_376, 18_626_451],
              denominator: [660_865_024, 931_322_574],
              currency: {
                decimals: 18,
                symbol: 'BNB',
                chainId: 56,
                address: TOKENS[1].address,
              },
              token: {
                decimals: 18,
                symbol: 'BNB',
                chainId: 56,
                address: TOKENS[1].address,
              },
            },
            {
              numerator: [743_964_672, 219_226_327, 5],
              denominator: [660_865_024, 931_322_574],
              currency: {
                decimals: 18,
                symbol: 'BUSD',
                chainId: 56,
                address: TOKENS[0].address,
              },
              token: {
                decimals: 18,
                symbol: 'BUSD',
                chainId: 56,
                address: TOKENS[0].address,
              },
            },
          ],
          swapName: 'pancakeswap',
        },
      ],
      [
        2,
        {
          liquidityToken: {
            decimals: 18,
            symbol: 'Cake-LP',
            name: 'Pancake LPs',
            chainId: 56,
            address: pairAddress,
          },
          tokenAmounts: [
            {
              numerator: [528_613_376, 18_626_451],
              denominator: [660_865_024, 931_322_574],
              currency: {
                decimals: 18,
                symbol: 'BNB',
                chainId: 56,
                address: TOKENS[1].address,
              },
              token: {
                decimals: 18,
                symbol: 'BNB',
                chainId: 56,
                address: TOKENS[1].address,
              },
            },
            {
              numerator: [743_964_672, 219_226_327, 5],
              denominator: [660_865_024, 931_322_574],
              currency: {
                decimals: 18,
                symbol: 'BUSD',
                chainId: 56,
                address: TOKENS[0].address,
              },
              token: {
                decimals: 18,
                symbol: 'BUSD',
                chainId: 56,
                address: TOKENS[0].address,
              },
            },
          ],
          swapName: 'pancakeswap',
        },
      ],
    ];
    expect(JSON.parse(JSON.stringify(result))).toStrictEqual(expected);
  });
});
