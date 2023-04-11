import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PLATFORMS } from 'src/common/constants/platforms';
import { ContractEntity } from 'src/modules/contracts/contract.entity';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import { ConfigService } from 'src/shared/services/config.service';
import { SharedModule } from 'src/shared/shared.module';
import { Connection } from 'typeorm';
import {
  initializeTransactionalContext,
  patchTypeORMRepositoryWithBaseRepository,
} from 'typeorm-transactional-cls-hooked';
import { randomHex } from 'web3-utils';

import { ContractsSerializerService } from '../contracts-serializer.service';

const blockchainId = 1;

describe('The ContractsSerializerService', () => {
  let contractsSerializerService: ContractsSerializerService;
  let connection: Connection;

  initializeTransactionalContext();
  patchTypeORMRepositoryWithBaseRepository();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [SharedModule],
          useFactory: (configService: ConfigService) =>
            configService.typeOrmConfig,
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([ContractEntity]),
      ],
      providers: [ContractsService, ContractsSerializerService],
    })
      .useMocker(() => ({}))
      .compile();

    contractsSerializerService = module.get<ContractsSerializerService>(
      ContractsSerializerService,
    );

    connection = module.get<Connection>(Connection);
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('serialize/deserialize', () => {
    const tokenName = 'TEST';
    const tokenAddress = randomHex(20);

    it('should properly sync data after changes of state', async () => {
      const state = await contractsSerializerService.serializeContractsToState(
        blockchainId,
      );

      state.tokenAddress[tokenName] = tokenAddress;

      state.venusTokens.push({
        asset: tokenName,
        address: tokenAddress,
        vAddress: randomHex(20),
        decimals: 18,
      });

      state.farms.push({
        platform: PLATFORMS.APESWAP,
        token1: tokenName,
        token2: 'BNB',
        asset1Address: tokenAddress,
        asset2Address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        lpAddress: randomHex(20),
        pair: `${tokenName}-BNB`,
        pid: 1000,
        isBorrowable: true,
      });

      await contractsSerializerService.deserializeContractsFromState(
        blockchainId,
        state,
      );

      const newState =
        await contractsSerializerService.serializeContractsToState(
          blockchainId,
        );

      expect(state).toEqual(newState);
    });
  });
});
