import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import hre, { ethers } from 'hardhat';
import { LoggerModule as RollbarLoggerModule } from 'nestjs-rollbar';
import { BLOCKCHAIN_NAMES } from 'src/common/constants/blockchain-names';
import { PLATFORMS } from 'src/common/constants/platforms';
import { fromWeiToNum, toBN, toWeiBN } from 'src/common/utils/big-number-utils';
import { BlockchainEntity } from 'src/modules/blockchains/blockchain.entity';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';
import { BlockchainsSettingsService } from 'src/modules/blockchains/blockchains-settings.service';
import { BnbUtilsService } from 'src/modules/bnb/bnb-utils.service';
import { BnbWeb3Service } from 'src/modules/bnb/bnb-web3.service';
import { MulticallViewService } from 'src/modules/bnb/multicall/multicall-view.service';
import { TokenEthService } from 'src/modules/bnb/token/token-eth.service';
import { TransactionsRepository } from 'src/modules/bnb/transactions.repository';
import { TransactionsService } from 'src/modules/bnb/transactions.service';
import { DexAggregatorService } from 'src/modules/bnb/uniswap/dex-aggregator.service';
import { PairsService } from 'src/modules/bnb/uniswap/trade-service/pairs.service';
import { TokenService } from 'src/modules/bnb/uniswap/trade-service/token.service';
import { TradeService } from 'src/modules/bnb/uniswap/trade-service/trade.service';
import { UniswapEthService } from 'src/modules/bnb/uniswap/uniswap-eth.service';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { TOKEN_NAMES } from 'src/modules/contracts/constants/token-names';
import { ContractEntity } from 'src/modules/contracts/contract.entity';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import { ContractsSerializerService } from 'src/modules/contracts/contracts-serializer.service';
import { OperationEntity } from 'src/modules/operations/operation.entity';
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
import { Connection } from 'typeorm';

import { Mocker } from '../../utils/Mocker';
import { getRandomDbName, prepareNodeTime } from '../common';

jest.setTimeout(1_000_000);

let uniswapEthService: UniswapEthService;
let dexAggregatorService: DexAggregatorService;
let blockchainService: BlockchainsService;
let contractsService: ContractsService;
let multicallService: MulticallViewService;
let mocker: Mocker;
let signers: SignerWithAddress[];
let web3Service: BnbWeb3Service;
let blockchainsSettingsService: BlockchainsSettingsService;
let strategiesService: StrategiesService;
let connection: Connection;
let app: TestingModule;

let operationId;

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
      TradeService,
      PairsService,
      MulticallViewService,
      StrategiesService,
      UniswapEthService,
      BnbWeb3Service,
      BnbUtilsService,
      TokenEthService,
      DexAggregatorService,
      TransactionsService,
      ConfigService,
      BlockchainsService,
      RuntimeKeysService,
      ContractsService,
      ContractsSerializerService,
      SwapPathsService,
      SwapPathsSerializerService,
      OperationsService,
      BlockchainsSettingsService,
      TokenService,
    ],
  })
    .useMocker(() => ({}))
    .compile();

  blockchainService = app.get<BlockchainsService>(BlockchainsService);

  contractsService = app.get<ContractsService>(ContractsService);

  multicallService = app.get<MulticallViewService>(MulticallViewService);

  strategiesService = app.get<StrategiesService>(StrategiesService);

  signers = await ethers.getSigners();
  mocker = new Mocker({
    contractsService,
    multicallService,
    strategiesService,
    deployer: signers[0],
    hre,
  });
  await mocker.mock({ contracts: ['uniswap', 'bolide'] });

  uniswapEthService = app.get<UniswapEthService>(UniswapEthService);

  web3Service = app.get<BnbWeb3Service>(BnbWeb3Service);

  dexAggregatorService = app.get<DexAggregatorService>(DexAggregatorService);
  await dexAggregatorService.onModuleInit();

  blockchainsSettingsService = app.get<BlockchainsSettingsService>(
    BlockchainsSettingsService,
  );
  connection = app.get<Connection>(Connection);
});

beforeEach(async () => {
  const { id } = await connection
    .getRepository(OperationEntity)
    .save({ blockchainId: 1, strategyId: 1 });
  operationId = id;
});

afterAll(async () => {
  jest.setTimeout(5000);

  await Promise.all([app.close(), connection.close()]);
});

describe('uniswap-swap [BNB-BUSD]', () => {
  let bnbBlockchain;
  const isTransactionProdMode = true;

  beforeEach(async () => {
    bnbBlockchain = await blockchainService.getBnbBlockchainEntity();

    await blockchainsSettingsService.updateBlockchainSettings(
      BLOCKCHAIN_NAMES.BNB,
      {
        ...bnbBlockchain.toDto().settings,
        txConfirmationBlocks: 0,
      },
    );

    bnbBlockchain = await blockchainService.getBnbBlockchainEntity();
  });

  it('swap eth -> token работает корректно', async () => {
    const [bnbToken, busdToken] = await contractsService.getTokensByNames(
      bnbBlockchain.id,
      [TOKEN_NAMES.BNB, TOKEN_NAMES.BUSD],
    );

    const pools = [
      { first: 'BNB', second: 'BUSD', price: [0.02, 10], amount: 100 },
    ];
    await mocker.addPools(pools);

    const expectTest = async (value) => {
      const pancakeRouter = await ethers.getContractFactory(
        'UniswapV2Router02',
      );

      const pancakeSwapRouterContract = await contractsService.getContract({
        blockchainId: bnbBlockchain.id,
        platform: PLATFORMS.PANCAKESWAP,
        type: CONTRACT_TYPES.ROUTER,
      });

      const pancakeSwap = pancakeRouter.attach(
        pancakeSwapRouterContract.address,
      );
      const factoryAdd = await pancakeSwap.factory();
      const pancakeFactory = await ethers.getContractFactory(
        'UniswapV2Factory',
      );
      const factory = pancakeFactory.attach(factoryAdd);
      const pairAddress = await factory.getPair(
        bnbToken.address,
        busdToken.address,
      );
      const TOKEN = await ethers.getContractFactory('Token');
      const bnb = TOKEN.attach(bnbToken.address);
      const balanceBNB = await bnb.balanceOf(pairAddress);
      expect(fromWeiToNum(toBN(balanceBNB.toString()))).toBe(value);
    };

    const { web3 } = await web3Service.createWeb3AndAccount(1);

    const strategyId = 1;
    const strategy = await strategiesService.getStrategyById(strategyId);
    const { storageContractId, logicContractId } = strategy;
    const storageContract = await contractsService.getContractById(
      storageContractId,
    );
    const logicContract = await contractsService.getContractById(
      logicContractId,
    );

    const data = {
      token1: bnbToken.address,
      token2: busdToken.address,
      amount: toWeiBN(0.004),
      platform: PLATFORMS.PANCAKESWAP,
      uid: operationId,
      isReverseSwap: false,
      storageContract: storageContract.toDto(),
      logicContract: logicContract.toDto(),
      web3,
      isTransactionProdMode,
    };

    await expectTest(2);
    await uniswapEthService.swap(data);
    await expectTest(2.004);
    await uniswapEthService.swap(data);
    await expectTest(2.008);
    await uniswapEthService.swap(data);
    await expectTest(2.012);
  });

  it('swap eth -> token работает корректно, isReverseSwap = true', async () => {
    const [bnbToken, busdToken] = await contractsService.getTokensByNames(
      bnbBlockchain.id,
      [TOKEN_NAMES.BNB, TOKEN_NAMES.BUSD],
    );

    const pools = [
      { first: 'BNB', second: 'BUSD', price: [0.02, 10], amount: 100 },
    ];
    await mocker.addPools(pools);

    const expectTest = async (value) => {
      const pancakeRouter = await ethers.getContractFactory(
        'UniswapV2Router02',
      );

      const pancakeSwapRouterContract = await contractsService.getContract({
        blockchainId: bnbBlockchain.id,
        platform: PLATFORMS.PANCAKESWAP,
        type: CONTRACT_TYPES.ROUTER,
      });

      const pancakeSwap = pancakeRouter.attach(
        pancakeSwapRouterContract.address,
      );
      const factoryAdd = await pancakeSwap.factory();
      const pancakeFactory = await ethers.getContractFactory(
        'UniswapV2Factory',
      );
      const factory = pancakeFactory.attach(factoryAdd);
      const pairAddress = await factory.getPair(
        bnbToken.address,
        busdToken.address,
      );
      const TOKEN = await ethers.getContractFactory('Token');
      const bnb = TOKEN.attach(bnbToken.address);
      const balanceBNB = await bnb.balanceOf(pairAddress);
      expect(fromWeiToNum(toBN(balanceBNB.toString()))).toBe(value);
    };

    const { web3 } = await web3Service.createWeb3AndAccount(1);

    const strategyId = 1;
    const strategy = await strategiesService.getStrategyById(strategyId);
    const { logicContractId, storageContractId } = strategy;
    const storageContract = await contractsService.getContractById(
      storageContractId,
    );
    const logicContract = await contractsService.getContractById(
      logicContractId,
    );

    const data = {
      token1: busdToken.address,
      token2: bnbToken.address,
      amount: toWeiBN(0.004),
      platform: PLATFORMS.PANCAKESWAP,
      uid: operationId,
      isReverseSwap: true,
      storageContract: storageContract.toDto(),
      logicContract: logicContract.toDto(),
      web3,
      isTransactionProdMode,
    };

    await expectTest(2);
    await uniswapEthService.swap(data);
    await expectTest(1.996);
    await uniswapEthService.swap(data);
    await expectTest(1.992);
    await uniswapEthService.swap(data);
    await expectTest(1.988);
  });

  it('swap eth -> token isUseV2 = true работает корректно', async () => {
    const [bnbToken, busdToken] = await contractsService.getTokensByNames(
      bnbBlockchain.id,
      [TOKEN_NAMES.BNB, TOKEN_NAMES.BUSD],
    );

    const pools = [
      { first: 'BNB', second: 'BUSD', price: [0.02, 10], amount: 100 },
    ];
    await mocker.addPools(pools);

    const expectTest = async (value) => {
      const pancakeRouter = await ethers.getContractFactory(
        'UniswapV2Router02',
      );

      const pancakeSwapRouterContract = await contractsService.getContract({
        blockchainId: bnbBlockchain.id,
        platform: PLATFORMS.PANCAKESWAP,
        type: CONTRACT_TYPES.ROUTER,
      });

      const pancakeSwap = pancakeRouter.attach(
        pancakeSwapRouterContract.address,
      );
      const factoryAdd = await pancakeSwap.factory();
      const pancakeFactory = await ethers.getContractFactory(
        'UniswapV2Factory',
      );
      const factory = pancakeFactory.attach(factoryAdd);
      const pairAddress = await factory.getPair(
        bnbToken.address,
        busdToken.address,
      );
      const TOKEN = await ethers.getContractFactory('Token');
      const bnb = TOKEN.attach(bnbToken.address);
      const balanceBNB = await bnb.balanceOf(pairAddress);
      expect(fromWeiToNum(toBN(balanceBNB.toString()))).toBe(value);
    };

    const { web3 } = await web3Service.createWeb3AndAccount(1);

    const strategyId = 1;
    const strategy = await strategiesService.getStrategyById(strategyId);
    const { storageContractId, logicContractId } = strategy;
    const storageContract = await contractsService.getContractById(
      storageContractId,
    );
    const logicContract = await contractsService.getContractById(
      logicContractId,
    );

    const data = {
      token1: bnbToken.address,
      token2: busdToken.address,
      amount: toWeiBN(0.004),
      platform: PLATFORMS.PANCAKESWAP,
      uid: operationId,
      isReverseSwap: false,
      storageContract: storageContract.toDto(),
      logicContract: logicContract.toDto(),
      web3,
      isUseV2: true,
      isTransactionProdMode,
    };

    await expectTest(2);
    await uniswapEthService.swap(data);
    await expectTest(2.004);
    await uniswapEthService.swap(data);
    await expectTest(2.008);
    await uniswapEthService.swap(data);
    await expectTest(2.012);
  });

  it('swap eth -> token isUseV2 = true & isReverseSwap = true работает корректно', async () => {
    const [bnbToken, busdToken] = await contractsService.getTokensByNames(
      bnbBlockchain.id,
      [TOKEN_NAMES.BNB, TOKEN_NAMES.BUSD],
    );

    const pools = [
      { first: 'BNB', second: 'BUSD', price: [0.02, 10], amount: 100 },
    ];
    await mocker.addPools(pools);

    const expectTest = async (value) => {
      const pancakeRouter = await ethers.getContractFactory(
        'UniswapV2Router02',
      );

      const pancakeSwapRouterContract = await contractsService.getContract({
        blockchainId: bnbBlockchain.id,
        platform: PLATFORMS.PANCAKESWAP,
        type: CONTRACT_TYPES.ROUTER,
      });

      const pancakeSwap = pancakeRouter.attach(
        pancakeSwapRouterContract.address,
      );
      const factoryAdd = await pancakeSwap.factory();
      const pancakeFactory = await ethers.getContractFactory(
        'UniswapV2Factory',
      );
      const factory = pancakeFactory.attach(factoryAdd);
      const pairAddress = await factory.getPair(
        bnbToken.address,
        busdToken.address,
      );
      const TOKEN = await ethers.getContractFactory('Token');
      const bnb = TOKEN.attach(bnbToken.address);
      const balanceBNB = await bnb.balanceOf(pairAddress);
      expect(fromWeiToNum(toBN(balanceBNB.toString()))).toBe(value);
    };

    const { web3 } = await web3Service.createWeb3AndAccount(1);

    const strategyId = 1;
    const strategy = await strategiesService.getStrategyById(strategyId);
    const { logicContractId, storageContractId } = strategy;
    const storageContract = await contractsService.getContractById(
      storageContractId,
    );
    const logicContract = await contractsService.getContractById(
      logicContractId,
    );

    const data = {
      token1: busdToken.address,
      token2: bnbToken.address,
      amount: toWeiBN(0.004),
      platform: PLATFORMS.PANCAKESWAP,
      uid: operationId,
      isReverseSwap: true,
      storageContract,
      logicContract,
      web3,
      isUseV2: true,
      isTransactionProdMode,
    };

    await expectTest(2);
    await uniswapEthService.swap(data);
    await expectTest(1.996);
    await uniswapEthService.swap(data);
    await expectTest(1.992);
    await uniswapEthService.swap(data);
    await expectTest(1.988);
  });
});
