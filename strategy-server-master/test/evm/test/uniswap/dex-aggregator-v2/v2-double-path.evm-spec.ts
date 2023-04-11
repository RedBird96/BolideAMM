/* eslint-disable max-len */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import hre from 'hardhat';
import { LoggerModule as RollbarLoggerModule } from 'nestjs-rollbar';
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
let tradeService: TradeService;
let signers: SignerWithAddress[];
let mocker: Mocker;
let app: TestingModule;

const uid = '12313';

const adrToName = async (address) => {
  const dbToken = await contractsService.getTokenByAddress(1, address);

  return dbToken.name;
};

const blockchainId = 1;

beforeAll(async () => {
  await prepareNodeTime();
});

beforeEach(async () => {
  await prepareNodeTime();

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

  tradeService = app.get<TradeService>(TradeService);
});

afterAll(async () => {
  jest.setTimeout(5000);
  await Promise.all([app.close()]);
});

describe('getProfitPath', () => {
  test('меняем path на BNB.BUSD', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 0.02 },
      { first: 'USDT', second: 'BUSD', price: [1, 1], amount: 10_000 },
    ];

    await mocker.addPools(pools);

    const params = {
      token1Name: 'BUSD',
      token2Name: 'BNB',
      amount: toWeiBN(0.01),
      market: 'Pancake' as const,
      uid,
      isReverseSwap: false,
      blockchainId,
    };

    const { path } = await tradeService.getProfitTrade(params);
    const result = await Promise.all(path.map((el) => adrToName(el)));
    expect(result).toEqual(['BUSD', 'BNB']);
  });

  test('isAmountsIn, меняем path на BNB.BUSD', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 0.02 },
      { first: 'USDT', second: 'BUSD', price: [1, 1], amount: 10_000 },
    ];

    await mocker.addPools(pools);

    const params = {
      token1Name: 'BUSD',
      token2Name: 'BNB',
      amount: toWeiBN(0.001),
      market: 'Pancake' as const,
      uid,
      isReverseSwap: true,
      blockchainId,
    };

    const { path } = await tradeService.getProfitTrade(params);

    const result = await Promise.all(path.map((el) => adrToName(el)));
    expect(result).toEqual(['BUSD', 'BNB']);
  });

  test('несмотря на то, что в стейте есть path на BNB.BUSD, меняем по более выгодному пути BUSD.USDT.BNB', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 302], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 300], amount: 0.02 },
      { first: 'USDT', second: 'BUSD', price: [1, 1], amount: 10_000 },
    ];

    await mocker.addPools(pools);

    const params = {
      token1Name: 'BUSD',
      token2Name: 'BNB',
      amount: toWeiBN(0.01),
      market: 'Pancake' as const,
      uid,
      blockchainId,
    };

    const { path } = await tradeService.getProfitTrade(params);

    const result = await Promise.all(path.map((el) => adrToName(el)));
    expect(result).toEqual(['BUSD', 'USDT', 'BNB']);
  });

  test('isAmountsIn, несмотря на то, что в стейте есть path на BNB.BUSD, меняем по более выгодному пути BUSD.USDT.BNB', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 304], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 300], amount: 0.02 },
      { first: 'USDT', second: 'BUSD', price: [1, 1], amount: 10_000 },
    ];

    await mocker.addPools(pools);

    const params = {
      token1Name: 'BUSD',
      token2Name: 'BNB',
      amount: toWeiBN(0.0003),
      market: 'Pancake' as const,
      uid,
      isReverseSwap: true,
      blockchainId,
    };

    const { path } = await tradeService.getProfitTrade(params);
    const result = await Promise.all(path.map((el) => adrToName(el)));
    expect(result).toEqual(['BUSD', 'USDT', 'BNB']);
  });

  test('Недостаточно ликвидности в прямом пуле BUSD.BNB, но в пуле BUSD.USDT.BNB она есть, возвращаем путь BUSD.USDT.BNB', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 304], amount: 0.03 },
      { first: 'USDT', second: 'BUSD', price: [1, 1], amount: 10_000 },
    ];

    await mocker.addPools(pools);

    const params = {
      token1Name: 'BUSD',
      token2Name: 'BNB',
      amount: toWeiBN(0.31),
      market: 'Pancake' as const,
      uid,
      isReverseSwap: false,
      blockchainId,
    };

    const { path } = await tradeService.getProfitTrade(params);
    const result = await Promise.all(path.map((el) => adrToName(el)));
    expect(result).toEqual(['BUSD', 'USDT', 'BNB']);
  });

  test('isAmountsIn, Недостаточно ликвидности в прямом пуле BUSD.BNB, но в пуле BUSD.USDT.BNB она есть, возвращаем путь BUSD.USDT.BNB', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 304], amount: 0.03 },
      { first: 'USDT', second: 'BUSD', price: [1, 1], amount: 10_000 },
    ];

    await mocker.addPools(pools);

    const params = {
      token1Name: 'BUSD',
      token2Name: 'BNB',
      amount: toWeiBN(0.001),
      market: 'Pancake' as const,
      uid,
      isReverseSwap: true,
      blockchainId,
    };

    const { path } = await tradeService.getProfitTrade(params);
    const result = await Promise.all(path.map((el) => adrToName(el)));
    expect(result).toEqual(['BUSD', 'USDT', 'BNB']);

    const params2 = {
      token1Name: 'BUSD',
      token2Name: 'BNB',
      amount: toWeiBN(0.0007),
      market: 'Pancake' as const,
      uid,
      isReverseSwap: true,
      blockchainId,
    };

    const { path: path2 } = await tradeService.getProfitTrade(params2);
    const result2 = await Promise.all(path2.map((el) => adrToName(el)));
    // expect(result2).toEqual(['BUSD', 'USDT', 'BNB']);

    expect(result2).toEqual(['BUSD', 'BNB']);
  });

  test('меняем path на BNB на BUSD по выгодному path [BNB,USDT,BUSD]', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 0.02 },
      { first: 'USDT', second: 'BUSD', price: [1, 1], amount: 10_000 },
    ];

    await mocker.addPools(pools);

    const params = {
      token1Name: 'BNB',
      token2Name: 'BUSD',
      amount: toWeiBN(0.0003),
      market: 'Pancake' as const,
      uid,
      isReverseSwap: false,
      blockchainId,
    };

    const { path } = await tradeService.getProfitTrade(params);
    const result = await Promise.all(path.map((el) => adrToName(el)));
    expect(result).toEqual(['BNB', 'USDT', 'BUSD']);
  });

  test('isAmountsIn, меняем path на BNB на BUSD по выгодному path [BNB,USDT,BUSD]', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 0.02 },
      { first: 'USDT', second: 'BUSD', price: [1, 1], amount: 10_000 },
    ];

    await mocker.addPools(pools);

    const params = {
      token1Name: 'BNB',
      token2Name: 'BUSD',
      amount: toWeiBN(0.01),
      market: 'Pancake' as const,
      uid,
      isReverseSwap: true,
      blockchainId,
    };

    const { path } = await tradeService.getProfitTrade(params);

    const result = await Promise.all(path.map((el) => adrToName(el)));
    expect(result).toEqual(['BNB', 'USDT', 'BUSD']);
  });
});
