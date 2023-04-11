import { CacheModule } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import hre, { ethers } from 'hardhat';
import { LoggerModule as RollbarLoggerModule } from 'nestjs-rollbar';
import { BlockchainEntity } from 'src/modules/blockchains/blockchain.entity';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';
import { BalanceService } from 'src/modules/bnb/balance.service';
import { BnbUtilsService } from 'src/modules/bnb/bnb-utils.service';
import { BnbWeb3Service } from 'src/modules/bnb/bnb-web3.service';
import { FarmEthService } from 'src/modules/bnb/farm/farm-eth.service';
import { MulticallViewService } from 'src/modules/bnb/multicall/multicall-view.service';
import { TokenEthService } from 'src/modules/bnb/token/token-eth.service';
import { TransactionsRepository } from 'src/modules/bnb/transactions.repository';
import { TransactionsService } from 'src/modules/bnb/transactions.service';
import { DexAggregatorService } from 'src/modules/bnb/uniswap/dex-aggregator.service';
import { PairsService as TradePairsService } from 'src/modules/bnb/uniswap/trade-service/pairs.service';
import { TradeService } from 'src/modules/bnb/uniswap/trade-service/trade.service';
import { UniswapEthService } from 'src/modules/bnb/uniswap/uniswap-eth.service';
import { ContractEntity } from 'src/modules/contracts/contract.entity';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import { ContractsSerializerService } from 'src/modules/contracts/contracts-serializer.service';
import { LogicEthService } from 'src/modules/land-borrow-farm-strategy/logic/logic-eth.service';
import { StorageEthService } from 'src/modules/land-borrow-farm-strategy/logic/storage-eth.service';
import { OperationsRepository } from 'src/modules/operations/operations.repository';
import { OperationsService } from 'src/modules/operations/operations.service';
import { PairsService } from 'src/modules/pairs/pairs.service';
import { RuntimeKeyEntity } from 'src/modules/runtime-keys/runtime-key.entity';
import { RuntimeKeysService } from 'src/modules/runtime-keys/runtime-keys.service';
import { StrategiesRepository } from 'src/modules/strategies/strategies.repository';
import { StrategiesService } from 'src/modules/strategies/strategies.service';
import { StrategiesRunnerService } from 'src/modules/strategies/strategies-runner.service';
import { StrategyPairRepository } from 'src/modules/strategies/strategy-pair/strategy-pair.repository';
import { SwapPathEntity } from 'src/modules/swap-paths/swap-path.entity';
import { SwapPathContractsEntity } from 'src/modules/swap-paths/swap-path-contracts.entity';
import { SwapPathsService } from 'src/modules/swap-paths/swap-paths.service';
import { SwapPathsSerializerService } from 'src/modules/swap-paths/swap-paths-serializer.service';
import { ConfigService } from 'src/shared/services/config.service';
import { VaultService } from 'src/shared/services/vault.service';
import { SharedModule } from 'src/shared/shared.module';

import { Mocker } from '../utils/Mocker';
import { prepareNodeTime } from './common';

let balanceService: BalanceService;
let contractsService: ContractsService;
let signers: SignerWithAddress[];
let strategiesService: StrategiesService;
let web3Service: BnbWeb3Service;

jest.setTimeout(1_000_000);
let app: TestingModule;

beforeAll(async () => {
  await prepareNodeTime();
});

beforeEach(async () => {
  app = await Test.createTestingModule({
    imports: [
      CacheModule.register(),
      TypeOrmModule.forRootAsync({
        imports: [SharedModule],
        useFactory: (configService: ConfigService) =>
          configService.typeOrmConfig,
        inject: [ConfigService],
      }),
      TypeOrmModule.forFeature([
        BlockchainEntity,
        ContractEntity,
        TransactionsRepository,
        StrategiesRepository,
        StrategyPairRepository,
        RuntimeKeyEntity,
        OperationsRepository,
        SwapPathEntity,
        SwapPathContractsEntity,
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
      ConfigService,
      BnbWeb3Service,
      VaultService,
      BlockchainsService,
      ContractsService,
      ContractsSerializerService,
      TransactionsService,
      RuntimeKeysService,
      PairsService,
      OperationsService,
      BnbUtilsService,
      UniswapEthService,
      TokenEthService,
      DexAggregatorService,
      SwapPathsService,
      SwapPathsSerializerService,
      FarmEthService,
      TradeService,
      TradePairsService,
      MulticallViewService,
      StrategiesRunnerService,
      BalanceService,
      StrategiesService,
      LogicEthService,
      StorageEthService,
    ],
  })
    .useMocker(() => ({}))
    .compile();

  signers = await ethers.getSigners();
  contractsService = app.get<ContractsService>(ContractsService);
  strategiesService = app.get<StrategiesService>(StrategiesService);

  const mocker = new Mocker({
    contractsService,
    strategiesService,
    deployer: signers[0],
    hre,
  });
  await mocker.mock({ contracts: [] });

  balanceService = app.get<BalanceService>(BalanceService);
  web3Service = app.get<BnbWeb3Service>(BnbWeb3Service);
});

afterAll(async () => {
  await Promise.all([app.close()]);
  jest.setTimeout(5000);
});

describe('balance-service', () => {
  it('Балансы eth и токенов работают корректно', async () => {
    const { address: owner } = signers[0];

    const result = await balanceService.getWalletBalances({
      address: owner,
      web3: await web3Service.createInstance(),
    });

    expect(Number(result.bnbBalance)).toBeGreaterThan(8999);
    expect(Number(result.blidBalance)).toEqual(1_000_000);
  });
});
