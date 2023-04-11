/* eslint-disable max-len */
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import hre from 'hardhat';
import { LoggerModule as RollbarLoggerModule } from 'nestjs-rollbar';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { PLATFORMS } from 'src/common/constants/platforms';
import { LogicException } from 'src/common/logic.exception';
import { fromWeiToNum, toWeiBN } from 'src/common/utils/big-number-utils';
import { BlockchainEntity } from 'src/modules/blockchains/blockchain.entity';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';
import { BlockchainsSettingsService } from 'src/modules/blockchains/blockchains-settings.service';
import { BnbUtilsService } from 'src/modules/bnb/bnb-utils.service';
import { BnbWeb3Service } from 'src/modules/bnb/bnb-web3.service';
import { TokenEthService } from 'src/modules/bnb/token/token-eth.service';
import { TransactionsRepository } from 'src/modules/bnb/transactions.repository';
import { TransactionsService } from 'src/modules/bnb/transactions.service';
import { DexAggregatorService } from 'src/modules/bnb/uniswap/dex-aggregator.service';
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

let dexAggregatorService: DexAggregatorService;
let contractsService: ContractsService;
let strategiesService: StrategiesService;
let signers: SignerWithAddress[];
let mocker: Mocker;
let app: TestingModule;
let web3Service: BnbWeb3Service;

const adrToName = async (address) => {
  const dbToken = await contractsService.getTokenByAddress(1, address);

  return dbToken.name;
};

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
      DexAggregatorService,
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
    ],
  })
    .useMocker(() => ({}))
    .compile();

  contractsService = app.get<ContractsService>(ContractsService);

  signers = await hre.ethers.getSigners();

  strategiesService = app.get<StrategiesService>(StrategiesService);

  mocker = new Mocker({
    contractsService,
    strategiesService,
    deployer: signers[0],
    hre,
  });
  await mocker.mock({ contracts: ['uniswap'] });

  dexAggregatorService = app.get<DexAggregatorService>(DexAggregatorService);
  web3Service = app.get<BnbWeb3Service>(BnbWeb3Service);

  await dexAggregatorService.onModuleInit();
});

afterAll(async () => {
  jest.setTimeout(5000);
  await Promise.all([app.close()]);
});

describe.skip('getProfitPath', () => {
  test('меняем path на LINK.BNB.USDT.BLID', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 0.02 },
      { first: 'BNB', second: 'LINK', price: [1, 25], amount: 0.02 },
      { first: 'USDT', second: 'BUSD', price: [1, 1], amount: 10 },
      { first: 'LINK', second: 'USDT', price: [1, 10], amount: 10 },
      { first: 'LINK', second: 'BUSD', price: [1, 10], amount: 10 },
      { first: 'USDT', second: 'BLID', price: [1, 2000], amount: 10 },
    ];

    await mocker.addPools(pools);

    const path = await dexAggregatorService.getProfitPath({
      platform: PLATFORMS.PANCAKESWAP,
      asset: 'LINK',
      assetTo: 'BLID',
      amount: toWeiBN(0.000_01),
      web3: await web3Service.createInstance(),
    });

    const result = await Promise.all(path.map((el) => adrToName(el)));
    expect(result).toEqual(['LINK', 'BNB', 'USDT', 'BLID']);
  });

  test('isAmountsIn, меняем path на LINK.BNB.USDT.BLID', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 0.02 },
      { first: 'BNB', second: 'LINK', price: [1, 25], amount: 0.02 },
      { first: 'USDT', second: 'BUSD', price: [1, 1], amount: 10_000 },
      { first: 'LINK', second: 'USDT', price: [1, 10], amount: 10 },
      { first: 'LINK', second: 'BUSD', price: [1, 10], amount: 10 },
      { first: 'USDT', second: 'BLID', price: [1, 2000], amount: 10 },
    ];

    await mocker.addPools(pools);

    const path = await dexAggregatorService.getProfitPath({
      platform: PLATFORMS.PANCAKESWAP,
      asset: 'LINK',
      assetTo: 'BLID',
      amount: toWeiBN(0.2),
      isAmountsIn: true,
      web3: await web3Service.createInstance(),
    });

    const result = await Promise.all(path.map((el) => adrToName(el)));
    expect(result).toEqual(['LINK', 'BNB', 'USDT', 'BLID']);
  });

  test('меняем path на LINK.BNB.USDT.BLID, но из-за маленькой ликвидности на BNB|USDT, берем менее профитный, но более ликвидный путь [LINK,USDT,BLID]', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 0.000_000_2 },
      { first: 'BNB', second: 'LINK', price: [1, 25], amount: 0.02 },
      { first: 'USDT', second: 'BUSD', price: [1, 1], amount: 10 },
      { first: 'LINK', second: 'USDT', price: [1, 10], amount: 10 },
      { first: 'LINK', second: 'BUSD', price: [1, 10], amount: 10 },
      { first: 'USDT', second: 'BLID', price: [1, 2000], amount: 10 },
    ];

    await mocker.addPools(pools);

    const path = await dexAggregatorService.getProfitPath({
      platform: PLATFORMS.PANCAKESWAP,
      asset: 'LINK',
      assetTo: 'BLID',
      amount: toWeiBN(0.000_01),
      web3: await web3Service.createInstance(),
    });

    const result = await Promise.all(path.map((el) => adrToName(el)));
    expect(result).toEqual(['LINK', 'USDT', 'BLID']);
  });

  test('isAmountsIn, меняем path на LINK.BNB.USDT.BLID, но из-за маленькой ликвидности на BNB|USDT, берем менее профитный, но более ликвидный путь [LINK,USDT,BLID]', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 0.000_000_2 },
      { first: 'BNB', second: 'LINK', price: [1, 25], amount: 0.02 },
      { first: 'USDT', second: 'BUSD', price: [1, 1], amount: 10_000 },
      { first: 'LINK', second: 'USDT', price: [1, 10], amount: 10 },
      { first: 'LINK', second: 'BUSD', price: [1, 10], amount: 10 },
      { first: 'USDT', second: 'BLID', price: [1, 2000], amount: 10 },
    ];

    await mocker.addPools(pools);

    const path = await dexAggregatorService.getProfitPath({
      platform: PLATFORMS.PANCAKESWAP,
      asset: 'LINK',
      assetTo: 'BLID',
      amount: toWeiBN(0.2),
      isAmountsIn: true,
      web3: await web3Service.createInstance(),
    });

    const result = await Promise.all(path.map((el) => adrToName(el)));
    expect(result).toEqual(['LINK', 'USDT', 'BLID']);
  });

  test('меняем path на LINK.BNB.USDT.BLID, но из-за маленькой ликвидности на BNB|USDT и LINK|USDT, берем самый не профитный, но ликвидный путь [LINK,BUSD,USDT,BLID]', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 0.000_000_2 },
      { first: 'BNB', second: 'LINK', price: [1, 25], amount: 0.02 },
      { first: 'USDT', second: 'BUSD', price: [1, 1], amount: 10 },
      { first: 'LINK', second: 'USDT', price: [1, 10], amount: 0.000_001 },
      { first: 'LINK', second: 'BUSD', price: [1, 10], amount: 10 },
      { first: 'USDT', second: 'BLID', price: [1, 2000], amount: 10 },
    ];

    await mocker.addPools(pools);

    const path = await dexAggregatorService.getProfitPath({
      platform: PLATFORMS.PANCAKESWAP,
      asset: 'LINK',
      assetTo: 'BLID',
      amount: toWeiBN(0.000_01),
      web3: await web3Service.createInstance(),
    });

    const result = await Promise.all(path.map((el) => adrToName(el)));
    expect(result).toEqual(['LINK', 'BUSD', 'USDT', 'BLID']);
  });

  test('isAmountsIn, меняем path на LINK.BNB.USDT.BLID, но из-за маленькой ликвидности на BNB|USDT и LINK|USDT, берем самый не профитный, но ликвидный путь [LINK,BUSD,USDT,BLID]', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 0.000_000_2 },
      { first: 'BNB', second: 'LINK', price: [1, 25], amount: 0.02 },
      { first: 'USDT', second: 'BUSD', price: [1, 1], amount: 10 },
      { first: 'LINK', second: 'USDT', price: [1, 10], amount: 0.000_001 },
      { first: 'LINK', second: 'BUSD', price: [1, 10], amount: 10 },
      { first: 'USDT', second: 'BLID', price: [1, 2000], amount: 10 },
    ];

    await mocker.addPools(pools);

    const path = await dexAggregatorService.getProfitPath({
      platform: PLATFORMS.PANCAKESWAP,
      asset: 'LINK',
      assetTo: 'BLID',
      amount: toWeiBN(0.2),
      isAmountsIn: true,
      web3: await web3Service.createInstance(),
    });

    const result = await Promise.all(path.map((el) => adrToName(el)));
    expect(result).toEqual(['LINK', 'BUSD', 'USDT', 'BLID']);
  });

  test('меняем path на LINK.BNB.USDT.BLID, но из-за маленькой ликвидности на BNB|USDT и LINK|USDT и BUSD|USDT, получаем ошибку', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 0.000_000_2 },
      { first: 'BNB', second: 'LINK', price: [1, 25], amount: 0.02 },
      { first: 'USDT', second: 'BUSD', price: [1, 1], amount: 0.000_001 },
      { first: 'LINK', second: 'USDT', price: [1, 10], amount: 0.000_001 },
      { first: 'LINK', second: 'BUSD', price: [1, 10], amount: 10 },
      { first: 'USDT', second: 'BLID', price: [1, 2000], amount: 10 },
    ];

    await mocker.addPools(pools);

    const platform = PLATFORMS.PANCAKESWAP;
    const asset = 'LINK';
    const assetTo = 'BLID';
    const amount = toWeiBN(0.000_01);

    await expect(
      dexAggregatorService.getProfitPath({
        platform,
        asset,
        assetTo,
        amount,
        web3: await web3Service.createInstance(),
      }),
    ).rejects.toThrow(
      new LogicException(
        ERROR_CODES.NOT_EXIST_PROFITABLE_PATH({
          asset,
          assetTo,
          amount: fromWeiToNum(amount),
        }),
      ),
    );
  });

  test('isAmountsIn, меняем path на LINK.BNB.USDT.BLID, но из-за маленькой ликвидности на BNB|USDT и LINK|USDT и BUSD|USDT, получаем ошибку', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 0.000_000_2 },
      { first: 'BNB', second: 'LINK', price: [1, 25], amount: 0.02 },
      { first: 'USDT', second: 'BUSD', price: [1, 1], amount: 0.000_001 },
      { first: 'LINK', second: 'USDT', price: [1, 10], amount: 0.000_001 },
      { first: 'LINK', second: 'BUSD', price: [1, 10], amount: 10 },
      { first: 'USDT', second: 'BLID', price: [1, 2000], amount: 10 },
    ];

    await mocker.addPools(pools);

    const asset = 'LINK';
    const assetTo = 'BLID';
    const amount = toWeiBN(0.2);

    await expect(
      dexAggregatorService.getProfitPath({
        platform: PLATFORMS.PANCAKESWAP,
        asset,
        assetTo,
        amount,
        isAmountsIn: true,
        web3: await web3Service.createInstance(),
      }),
    ).rejects.toThrow(
      new LogicException(
        ERROR_CODES.NOT_EXIST_PROFITABLE_PATH({
          asset,
          assetTo,
          amount: fromWeiToNum(amount),
        }),
      ),
    );
  });

  test('меняем по выгодному path на BLID.USDT.LINK', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 0.02 },
      { first: 'BNB', second: 'LINK', price: [1, 25], amount: 0.02 },
      { first: 'USDT', second: 'BUSD', price: [1, 1], amount: 10 },
      { first: 'LINK', second: 'USDT', price: [1, 10], amount: 10 },
      { first: 'LINK', second: 'BUSD', price: [1, 10], amount: 10 },
      { first: 'USDT', second: 'BLID', price: [1, 2000], amount: 10 },
    ];

    await mocker.addPools(pools);

    const path = await dexAggregatorService.getProfitPath({
      platform: PLATFORMS.PANCAKESWAP,
      asset: 'BLID',
      assetTo: 'LINK',
      amount: toWeiBN(0.01),
      web3: await web3Service.createInstance(),
    });

    const result = await Promise.all(path.map((el) => adrToName(el)));
    expect(result).toEqual(['BLID', 'USDT', 'LINK']);
  });

  test('isAmountsIn, меняем по выгодному path на BLID.USDT.LINK', async () => {
    const pools = [
      { first: 'BNB', second: 'BUSD', price: [1, 300], amount: 0.02 },
      { first: 'BNB', second: 'USDT', price: [1, 302], amount: 0.02 },
      { first: 'BNB', second: 'LINK', price: [1, 25], amount: 0.02 },
      { first: 'USDT', second: 'BUSD', price: [1, 1], amount: 10 },
      { first: 'LINK', second: 'USDT', price: [1, 10], amount: 10 },
      { first: 'LINK', second: 'BUSD', price: [1, 10], amount: 10 },
      { first: 'USDT', second: 'BLID', price: [1, 2000], amount: 10 },
    ];

    await mocker.addPools(pools);

    const path = await dexAggregatorService.getProfitPath({
      platform: PLATFORMS.PANCAKESWAP,
      asset: 'BLID',
      assetTo: 'LINK',
      amount: toWeiBN(0.000_005),
      isAmountsIn: true,
      web3: await web3Service.createInstance(),
    });

    const result = await Promise.all(path.map((el) => adrToName(el)));
    expect(result).toEqual(['BLID', 'USDT', 'LINK']);
  });
});
