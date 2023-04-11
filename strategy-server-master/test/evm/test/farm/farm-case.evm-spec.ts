import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import hre, { ethers } from 'hardhat';
import { LoggerModule as RollbarLoggerModule } from 'nestjs-rollbar';
import { PLATFORMS } from 'src/common/constants/platforms';
import {
  fromWeiToNum,
  safeBN,
  toWeiBN,
} from 'src/common/utils/big-number-utils';
import { AccountsRepository } from 'src/modules/accounts/accounts.repository';
import { AccountsService } from 'src/modules/accounts/accounts.service';
import { BlockchainEntity } from 'src/modules/blockchains/blockchain.entity';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';
import { BlockchainsSettingsService } from 'src/modules/blockchains/blockchains-settings.service';
import { BnbAnalyticsWorkers } from 'src/modules/bnb/analytics/bnb-analytics.workers';
import { ApeSwapEthService } from 'src/modules/bnb/apeswap/apeswap-eth.serivce';
import { BiswapEthService } from 'src/modules/bnb/biswap/biswap-eth.service';
import { BnbUtilsService } from 'src/modules/bnb/bnb-utils.service';
import { BnbWeb3Service } from 'src/modules/bnb/bnb-web3.service';
import { FarmEthService } from 'src/modules/bnb/farm/farm-eth.service';
import { MulticallViewService } from 'src/modules/bnb/multicall/multicall-view.service';
import { PancakeEthService } from 'src/modules/bnb/pancake/pancake-eth.service';
import { TokenEthService } from 'src/modules/bnb/token/token-eth.service';
import { TransactionsRepository } from 'src/modules/bnb/transactions.repository';
import { TransactionsService } from 'src/modules/bnb/transactions.service';
import { DexAggregatorService } from 'src/modules/bnb/uniswap/dex-aggregator.service';
import { PairsService as TradePairsService } from 'src/modules/bnb/uniswap/trade-service/pairs.service';
import { TradeService } from 'src/modules/bnb/uniswap/trade-service/trade.service';
import { UniswapEthService } from 'src/modules/bnb/uniswap/uniswap-eth.service';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { ContractEntity } from 'src/modules/contracts/contract.entity';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import { ContractsSerializerService } from 'src/modules/contracts/contracts-serializer.service';
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
import { AdminCommandsService } from 'src/modules/telegram/commands/admin-commands.service';
import { GeneralCommandsService } from 'src/modules/telegram/commands/general-commands.service';
import { TelegramSettingsRepository } from 'src/modules/telegram/settings/tg-settings.repository';
import { TelegramSettingsService } from 'src/modules/telegram/settings/tg-settings.service';
import { TelegramService } from 'src/modules/telegram/telegram.service';
import { ConfigService } from 'src/shared/services/config.service';
import { SharedModule } from 'src/shared/shared.module';

import { Mocker } from '../../utils/Mocker';
import { prepareNodeTime } from '../common';

jest.setTimeout(1_000_000);

let blockchainService: BlockchainsService;
let contractsService: ContractsService;
let strategiesService: StrategiesService;
let farmEthService: FarmEthService;
let signers: SignerWithAddress[];
let app: TestingModule;
let web3Service: BnbWeb3Service;

beforeAll(async () => {
  await prepareNodeTime();
});

beforeEach(async () => {
  app = await Test.createTestingModule({
    imports: [
      TypeOrmModule.forRootAsync({
        imports: [SharedModule],
        useFactory: (configService: ConfigService) =>
          configService.typeOrmConfig,
        inject: [ConfigService],
      }),
      TypeOrmModule.forFeature([
        BlockchainEntity,
        TransactionsRepository,
        StrategiesRepository,
        StrategyPairRepository,
        OperationsRepository,
        RuntimeKeyEntity,
        ContractEntity,
        AccountsRepository,
        TelegramSettingsRepository,
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
      UniswapEthService,
      BnbWeb3Service,
      BnbUtilsService,
      TokenEthService,
      DexAggregatorService,
      FarmEthService,
      TransactionsService,
      ConfigService,
      BlockchainsService,
      RuntimeKeysService,
      ContractsService,
      ContractsSerializerService,
      SwapPathsService,
      SwapPathsSerializerService,
      StrategiesService,
      PairsService,
      OperationsService,
      TelegramService,
      PancakeEthService,
      ApeSwapEthService,
      BiswapEthService,
      AccountsService,
      AdminCommandsService,
      GeneralCommandsService,
      TelegramSettingsService,
      StrategiesRunnerService,
      BnbAnalyticsWorkers,
      BlockchainsSettingsService,
      TradeService,
      TradePairsService,
      MulticallViewService,
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
  await mocker.mock({ contracts: ['uniswap', 'farm', 'bolide'] });

  blockchainService = app.get<BlockchainsService>(BlockchainsService);

  contractsService = app.get<ContractsService>(ContractsService);

  farmEthService = app.get<FarmEthService>(FarmEthService);

  web3Service = app.get<BnbWeb3Service>(BnbWeb3Service);
});

afterAll(async () => {
  jest.setTimeout(5000);

  await Promise.all([app.close()]);
});

describe('farm', () => {
  it('getStakedAmount работает корректно', async () => {
    const pid = 1;

    const bnbBlockchain = await blockchainService.getBnbBlockchainEntity();

    const strategyId = 1;
    const strategy = await strategiesService.getStrategyById(strategyId);
    const { storageContractId, logicContractId } = strategy;
    const storageContract = await contractsService.getContractById(
      storageContractId,
    );
    const logicContract = await contractsService.getContractById(
      logicContractId,
    );

    const apeSwapMasterChefContract = await contractsService.getContract({
      blockchainId: bnbBlockchain.id,
      platform: PLATFORMS.APESWAP,
      type: CONTRACT_TYPES.MASTER,
    });

    const farms = await contractsService.getFarms(bnbBlockchain.id);

    const mockedFarm = farms.find(
      (farm) => farm.platform === PLATFORMS.APESWAP && farm.pid === pid,
    ) as any;

    const params = {
      farm: mockedFarm,
      logicContract,
      storageContract,
      web3: await web3Service.createInstance(),
    };

    const info = await farmEthService.getStakedAmount(params);
    expect(fromWeiToNum(info)).toBe(0);

    const logicFactory = await ethers.getContractFactory('Logic');
    const logic = logicFactory.attach(logicContract.address);
    await logic.deposit(
      apeSwapMasterChefContract.address,
      pid,
      safeBN(toWeiBN(100)),
    );

    const info2 = await farmEthService.getStakedAmount(params);
    expect(fromWeiToNum(info2)).toBe(100);
  });
});
