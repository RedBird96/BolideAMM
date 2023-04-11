import { SWAP_NAME } from '@bolide/swap-sdk';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PLATFORMS } from 'src/common/constants/platforms';
import { toWeiBN } from 'src/common/utils/big-number-utils';
import { BlockchainEntity } from 'src/modules/blockchains/blockchain.entity';
import { BlockchainsService } from 'src/modules/blockchains/blockchains.service';
import { ContractEntity } from 'src/modules/contracts/contract.entity';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import { RuntimeKeyEntity } from 'src/modules/runtime-keys/runtime-key.entity';
import { RuntimeKeysService } from 'src/modules/runtime-keys/runtime-keys.service';
import { ConfigService } from 'src/shared/services/config.service';
import { SharedModule } from 'src/shared/shared.module';
import { Connection } from 'typeorm';

import { BnbUtilsService } from '../../bnb-utils.service';
import { BnbWeb3Service } from '../../bnb-web3.service';
import { MulticallViewService } from '../../multicall/multicall-view.service';
import { TransactionEntity } from '../../transaction.entity';
import { TransactionsService } from '../../transactions.service';
import { PairsService } from './pairs.service';
import { TokenService } from './token.service';
import { TradeService } from './trade.service';

process.env.OPERATIONS_PRIVATE_KEY =
  'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

jest.setTimeout(200_000);
const blockchainId = 1;

describe('trade service tests', () => {
  let app: TestingModule;
  let pairsService: PairsService;
  let tradeService: TradeService;
  let tokenService: TokenService;
  let connection: Connection;

  beforeAll(async () => {
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
          ContractEntity,
          TransactionEntity,
          RuntimeKeyEntity,
        ]),
      ],
      controllers: [],
      providers: [
        TradeService,
        PairsService,
        MulticallViewService,
        ConfigService,
        BnbUtilsService,
        BnbWeb3Service,
        BlockchainsService,
        ContractsService,
        TransactionsService,
        RuntimeKeysService,
        TokenService,
      ],
    })
      .useMocker(() => ({}))
      .compile();

    pairsService = app.get<PairsService>(PairsService);
    tradeService = app.get<TradeService>(TradeService);
    tokenService = app.get<TokenService>(TokenService);

    connection = app.get<Connection>(Connection);
  });

  afterAll(async () => {
    await app.close();
    await connection.close();
  });

  describe('Find best trade in bsc', () => {
    it('market = all', async () => {
      const BTC = await tokenService.getTokenBySymbol('BTC', blockchainId);
      const FIL = await tokenService.getTokenBySymbol('FIL', blockchainId);

      const params = {
        token1Name: BTC.symbol,
        token2Name: FIL.symbol,
        amount: toWeiBN(11),
        uid: 'test-123',
        isReverseSwap: false,
        blockchainId,
      };

      const { path: result } = await tradeService.getProfitTrade(params);
      expect(result[0]).toBe(BTC.address);
      expect(result[result.length - 1]).toBe(FIL.address);
    });

    it('market = Pancake', async () => {
      const BTC = await tokenService.getTokenBySymbol('BTC', blockchainId);
      const FIL = await tokenService.getTokenBySymbol('FIL', blockchainId);

      const params = {
        token1Name: BTC.symbol,
        token2Name: FIL.symbol,
        amount: toWeiBN(11),
        platform: PLATFORMS.PANCAKESWAP,
        uid: 'test-123',
        isReverseSwap: false,
        blockchainId,
      };

      const { path: result } = await tradeService.getProfitTrade(params);
      expect(result[0]).toBe(BTC.address);
      expect(result[result.length - 1]).toBe(FIL.address);
    });

    it('market = BiSwap', async () => {
      const BTC = await tokenService.getTokenBySymbol('BTC', blockchainId);
      const FIL = await tokenService.getTokenBySymbol('FIL', blockchainId);

      const params = {
        token1Name: BTC.symbol,
        token2Name: FIL.symbol,
        amount: toWeiBN(11),
        platform: PLATFORMS.BISWAP,
        uid: 'test-123',
        isReverseSwap: false,
        blockchainId,
      };

      const { path: result } = await tradeService.getProfitTrade(params);
      expect(result[0]).toBe(BTC.address);
      expect(result[result.length - 1]).toBe(FIL.address);
    });

    it('market = ApeSwap', async () => {
      const BTC = await tokenService.getTokenBySymbol('BTC', blockchainId);
      const FIL = await tokenService.getTokenBySymbol('FIL', blockchainId);

      const params = {
        token1Name: BTC.symbol,
        token2Name: FIL.symbol,
        amount: toWeiBN(11),
        platform: PLATFORMS.APESWAP,
        uid: 'test-123',
        isReverseSwap: false,
        blockchainId,
      };

      const { path: result } = await tradeService.getProfitTrade(params);
      expect(result[0]).toBe(BTC.address);
      expect(result[result.length - 1]).toBe(FIL.address);
    });

    it('isReverseSwap = true', async () => {
      const BTC = await tokenService.getTokenBySymbol('BTC', blockchainId);
      const FIL = await tokenService.getTokenBySymbol('FIL', blockchainId);

      const params = {
        token1Name: BTC.symbol,
        token2Name: FIL.symbol,
        amount: toWeiBN(11),
        platform: PLATFORMS.PANCAKESWAP,
        uid: 'test-123',
        isReverseSwap: true,
        blockchainId,
      };

      const { path: result } = await tradeService.getProfitTrade(params);
      expect(result[0]).toBe(BTC.address);
      expect(result[result.length - 1]).toBe(FIL.address);
    });

    it('isJustPrice = true', async () => {
      const BTC = await tokenService.getTokenBySymbol('BTC', blockchainId);
      const FIL = await tokenService.getTokenBySymbol('FIL', blockchainId);

      const params = {
        token1Name: BTC.symbol,
        token2Name: FIL.symbol,
        amount: toWeiBN(11),
        platform: PLATFORMS.PANCAKESWAP,
        uid: 'test-123',
        isReverseSwap: false,
        blockchainId,
        isJustPrice: true,
      };

      const { path: result } = await tradeService.getProfitTrade(params);
      expect(result[0]).toBe(BTC.address);
      expect(result[result.length - 1]).toBe(FIL.address);
    });

    it('doge(decimals 8)', async () => {
      const BTC = await tokenService.getTokenBySymbol('BTC', blockchainId);
      const FIL = await tokenService.getTokenBySymbol('FIL', blockchainId);

      const params = {
        token1Name: BTC.symbol,
        token2Name: FIL.symbol,
        amount: toWeiBN(1),
        platform: PLATFORMS.PANCAKESWAP,
        uid: 'test-123',
        isReverseSwap: false,
        blockchainId,
      };

      const { path: result } = await tradeService.getProfitTrade(params);
      expect(result[0]).toBe(BTC.address);
      expect(result[result.length - 1]).toBe(FIL.address);
    });

    it('useAllCommonPairs(BTC -> BUSD) should returns more than 10 paths', async () => {
      const BTC = await tokenService.getTokenBySymbol('BTC', blockchainId);
      const BUSD = await tokenService.getTokenBySymbol('BUSD', blockchainId);

      const result = await pairsService.useAllCommonPairs(
        BTC,
        BUSD,
        SWAP_NAME.pancakeswap,
        blockchainId,
        false,
      );

      expect(result.length).toBeGreaterThan(10);
    });
  });
});
