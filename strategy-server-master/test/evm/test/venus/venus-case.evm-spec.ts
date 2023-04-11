import { CacheModule } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import hre, { ethers } from 'hardhat';
import { LoggerModule as RollbarLoggerModule } from 'nestjs-rollbar';
import { BLOCKCHAIN_NAMES } from 'src/common/constants/blockchain-names';
import { fromWeiToNum, toWeiBN } from 'src/common/utils/big-number-utils';
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
import { FarmAnalyticService } from 'src/modules/bnb/farm/farm-analytics.service';
import { FarmEthService } from 'src/modules/bnb/farm/farm-eth.service';
import { PancakeEthService } from 'src/modules/bnb/pancake/pancake-eth.service';
import { TokenEthService } from 'src/modules/bnb/token/token-eth.service';
import { TransactionsRepository } from 'src/modules/bnb/transactions.repository';
import { TransactionsService } from 'src/modules/bnb/transactions.service';
import { DexAggregatorService } from 'src/modules/bnb/uniswap/dex-aggregator.service';
import { UniswapEthService } from 'src/modules/bnb/uniswap/uniswap-eth.service';
import { VenusBalanceService } from 'src/modules/bnb/venus/venus-balance.service';
import { VenusEthService } from 'src/modules/bnb/venus/venus-eth.service';
import { ContractEntity } from 'src/modules/contracts/contract.entity';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import { ContractsSerializerService } from 'src/modules/contracts/contracts-serializer.service';
import type { InnerTokenDto } from 'src/modules/contracts/dto/InnerTokenDataDto';
import { OperationEntity } from 'src/modules/operations/operation.entity';
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
import { Connection } from 'typeorm';

import { Mocker } from '../../utils/Mocker';
import { prepareNodeTime } from '../common';

jest.setTimeout(1_000_000);

let blockchainService: BlockchainsService;
let contractsService: ContractsService;
let strategiesService: StrategiesService;
let venusEthService: VenusEthService;
let tokenEthService: TokenEthService;
let blockchainsSettingsService: BlockchainsSettingsService;
let web3Service: BnbWeb3Service;
let transactionsService: TransactionsService;

let mocker: Mocker;
let signers: SignerWithAddress[];
let connection: Connection;
let app: TestingModule;

let operationId;

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
      CacheModule.register(),
    ],
    controllers: [],
    providers: [
      VenusEthService,
      VenusBalanceService,
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
      FarmAnalyticService,
      StrategiesRunnerService,
      BnbAnalyticsWorkers,
      BlockchainsSettingsService,
    ],
  })
    .useMocker(() => ({}))
    .compile();

  contractsService = app.get<ContractsService>(ContractsService);

  strategiesService = app.get<StrategiesService>(StrategiesService);

  signers = await ethers.getSigners();

  mocker = new Mocker({
    contractsService,
    strategiesService,
    deployer: signers[0],
    hre,
  });
  await mocker.mock({ contracts: ['venus', 'bolide'] });

  blockchainService = app.get<BlockchainsService>(BlockchainsService);

  venusEthService = app.get<VenusEthService>(VenusEthService);

  tokenEthService = app.get<TokenEthService>(TokenEthService);

  web3Service = app.get<BnbWeb3Service>(BnbWeb3Service);

  blockchainsSettingsService = app.get<BlockchainsSettingsService>(
    BlockchainsSettingsService,
  );

  transactionsService = app.get<TransactionsService>(TransactionsService);

  connection = app.get<Connection>(Connection);
});

beforeAll(async () => {
  await prepareNodeTime();
});

beforeEach(async () => {
  const { id } = await connection
    .getRepository(OperationEntity)
    .save({ blockchainId: 1, strategyId: 1 });
  operationId = id;
});

afterAll(async () => {
  await Promise.all([app.close()]);
  jest.setTimeout(5000);
});

describe('venus', () => {
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

  it('mint USDT работает корректно', async () => {
    const token = 'vUSDT';

    const venusTokens = await contractsService.getVenusTokens(bnbBlockchain.id);
    const vUSD = venusTokens.find(({ name }) => name === token);
    const usdtAddress = (vUSD.data as InnerTokenDto).baseContractAddress;

    const strategyId = 1;
    const strategy = await strategiesService.getStrategyById(strategyId);
    const { storageContractId, logicContractId } = strategy;
    const storageContract = await contractsService.getContractById(
      storageContractId,
    );
    const logicContract = await contractsService.getContractById(
      logicContractId,
    );

    const { amount: balanceUSDTBefore } =
      await tokenEthService.getTokenAvailableAmount({
        tokenAddress: usdtAddress,
        walletAddress: logicContract.address,
        storageContract,
        web3: await web3Service.createInstance(),
      });

    const { amount: balanceVUSDTBefore } =
      await tokenEthService.getTokenAvailableAmount({
        tokenAddress: vUSD.address,
        walletAddress: logicContract.address,
        storageContract,
        web3: await web3Service.createInstance(),
      });

    expect(fromWeiToNum(balanceUSDTBefore)).toBe(500_000);
    expect(fromWeiToNum(balanceVUSDTBefore)).toBe(0);

    const { web3 } = await web3Service.createWeb3AndAccount(1);

    await venusEthService.mint(
      usdtAddress,
      toWeiBN(10),
      operationId,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
    );

    const { amount: balanceUSDTAfter } =
      await tokenEthService.getTokenAvailableAmount({
        tokenAddress: usdtAddress,
        walletAddress: logicContract.address,
        storageContract,
        web3: await web3Service.createInstance(),
      });

    const { amount: balanceVUSDTAfter } =
      await tokenEthService.getTokenAvailableAmount({
        tokenAddress: vUSD.address,
        walletAddress: logicContract.address,
        storageContract,
        web3: await web3Service.createInstance(),
      });

    expect(fromWeiToNum(balanceUSDTAfter)).toBe(499_990);
    expect(fromWeiToNum(balanceVUSDTAfter)).toBe(10);
  });

  it('redeemUnderlying USDT работает корректно', async () => {
    const token = 'vUSDT';

    const venusTokens = await contractsService.getVenusTokens(bnbBlockchain.id);
    const vUSD = venusTokens.find(({ name }) => name === token);
    const usdtAddress = (vUSD.data as InnerTokenDto).baseContractAddress;

    const strategyId = 1;
    const strategy = await strategiesService.getStrategyById(strategyId);
    const { storageContractId, logicContractId } = strategy;
    const storageContract = await contractsService.getContractById(
      storageContractId,
    );
    const logicContract = await contractsService.getContractById(
      logicContractId,
    );

    const { amount: balanceUSDTBefore } =
      await tokenEthService.getTokenAvailableAmount({
        tokenAddress: usdtAddress,
        walletAddress: logicContract.address,
        storageContract,
        web3: await web3Service.createInstance(),
      });
    const { amount: balanceVUSDTBefore } =
      await tokenEthService.getTokenAvailableAmount({
        tokenAddress: vUSD.address,
        walletAddress: logicContract.address,
        storageContract,
        web3: await web3Service.createInstance(),
      });

    expect(fromWeiToNum(balanceUSDTBefore)).toBe(500_000);
    expect(fromWeiToNum(balanceVUSDTBefore)).toBe(0);

    const { web3 } = await web3Service.createWeb3AndAccount(1);

    await venusEthService.mint(
      usdtAddress,
      toWeiBN(10),
      operationId,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
    );
    await venusEthService.redeemUnderlying({
      tokenAddress: usdtAddress,
      tokensToWithdraw: toWeiBN(10),
      uid: operationId,
      storageContract,
      logicContract,
      web3,
      isTransactionProdMode,
    });

    const { amount: balanceUSDTAfter } =
      await tokenEthService.getTokenAvailableAmount({
        tokenAddress: usdtAddress,
        walletAddress: logicContract.address,
        storageContract,
        web3: await web3Service.createInstance(),
      });

    const { amount: balanceVUSDTAfter } =
      await tokenEthService.getTokenAvailableAmount({
        tokenAddress: vUSD.address,
        walletAddress: logicContract.address,
        storageContract,
        web3: await web3Service.createInstance(),
      });

    expect(fromWeiToNum(balanceUSDTAfter)).toBe(500_000);
    expect(fromWeiToNum(balanceVUSDTAfter)).toBe(0);
  });

  it('borrow LINK работает корректно', async () => {
    const linkToken = await contractsService.getTokenByName(
      bnbBlockchain.id,
      'LINK',
    );

    const strategyId = 1;
    const strategy = await strategiesService.getStrategyById(strategyId);
    const { storageContractId, logicContractId } = strategy;
    const storageContract = await contractsService.getContractById(
      storageContractId,
    );
    const logicContract = await contractsService.getContractById(
      logicContractId,
    );

    const { amount: balanceBefore } =
      await tokenEthService.getTokenAvailableAmount({
        tokenAddress: linkToken.address,
        walletAddress: logicContract.address,
        storageContract,
        web3: await web3Service.createInstance(),
      });

    expect(fromWeiToNum(balanceBefore)).toBe(500_000);

    const { web3 } = await web3Service.createWeb3AndAccount(1);

    const txData1 = await venusEthService.borrowToken({
      tokenAddress: linkToken.address,
      borrowAmount: toWeiBN(10),
      uid: operationId,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
    });

    await transactionsService.sendTransaction({
      transaction: txData1.tx,
      method: 'borrow',
      meta: txData1.meta,
      uid: operationId,
      func: 'borrowToken',
      web3,
      isTransactionProdMode,
    });

    const { amount: balanceAfter } =
      await tokenEthService.getTokenAvailableAmount({
        tokenAddress: linkToken.address,
        walletAddress: logicContract.address,
        storageContract,
        web3: await web3Service.createInstance(),
      });

    expect(fromWeiToNum(balanceAfter)).toBe(500_010);
  });

  it('repayBorrow LINK работает корректно', async () => {
    const linkToken = await contractsService.getTokenByName(
      bnbBlockchain.id,
      'LINK',
    );

    const strategyId = 1;
    const strategy = await strategiesService.getStrategyById(strategyId);
    const { storageContractId, logicContractId } = strategy;
    const storageContract = await contractsService.getContractById(
      storageContractId,
    );
    const logicContract = await contractsService.getContractById(
      logicContractId,
    );

    const { amount: balanceBefore } =
      await tokenEthService.getTokenAvailableAmount({
        tokenAddress: linkToken.address,
        walletAddress: logicContract.address,
        storageContract,
        web3: await web3Service.createInstance(),
      });

    expect(fromWeiToNum(balanceBefore)).toBe(500_000);

    const { web3 } = await web3Service.createWeb3AndAccount(1);

    const txData1 = await venusEthService.borrowToken({
      tokenAddress: linkToken.address,
      borrowAmount: toWeiBN(10),
      uid: operationId,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
    });

    await transactionsService.sendTransaction({
      transaction: txData1.tx,
      method: 'borrow',
      meta: txData1.meta,
      uid: operationId,
      func: 'borrowToken',
      web3,
      isTransactionProdMode,
    });

    const txData2 = await venusEthService.repayBorrowToken({
      tokenAddress: linkToken.address,
      repayAmount: toWeiBN(10),
      uid: operationId,
      logicContract,
      storageContract,
      web3,
      isTransactionProdMode,
    });

    await transactionsService.sendTransaction({
      transaction: txData2.tx,
      method: 'repayBorrow',
      meta: txData2.meta,
      uid: operationId,
      func: 'repayBorrowToken',
      web3,
      isTransactionProdMode,
    });

    const { amount: balanceAfter } =
      await tokenEthService.getTokenAvailableAmount({
        tokenAddress: linkToken.address,
        walletAddress: logicContract.address,
        storageContract,
        web3: await web3Service.createInstance(),
      });

    expect(fromWeiToNum(balanceAfter)).toBe(500_000);
  });
});
