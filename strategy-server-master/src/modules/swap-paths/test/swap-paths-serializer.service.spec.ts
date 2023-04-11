import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PLATFORMS } from 'src/common/constants/platforms';
import { TOKEN_NAMES } from 'src/modules/contracts/constants/token-names';
import { ContractEntity } from 'src/modules/contracts/contract.entity';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import { ConfigService } from 'src/shared/services/config.service';
import { SharedModule } from 'src/shared/shared.module';
import { Connection } from 'typeorm';
import {
  initializeTransactionalContext,
  patchTypeORMRepositoryWithBaseRepository,
} from 'typeorm-transactional-cls-hooked';

import { SwapPathEntity } from '../swap-path.entity';
import { SwapPathContractsEntity } from '../swap-path-contracts.entity';
import { SwapPathsService } from '../swap-paths.service';
import { SwapPathsSerializerService } from '../swap-paths-serializer.service';

const blockchainId = 1;

describe('The SwapPathsSerializerService', () => {
  let swapPathsSerializerService: SwapPathsSerializerService;
  let contractsService: ContractsService;
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
        TypeOrmModule.forFeature([
          ContractEntity,
          SwapPathEntity,
          SwapPathContractsEntity,
        ]),
      ],
      providers: [
        ContractsService,
        SwapPathsService,
        SwapPathsSerializerService,
      ],
    })
      .useMocker(() => ({}))
      .compile();

    swapPathsSerializerService = module.get<SwapPathsSerializerService>(
      SwapPathsSerializerService,
    );

    contractsService = module.get<ContractsService>(ContractsService);

    connection = module.get<Connection>(Connection);
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('serialize/deserialize', () => {
    it('should properly sync data after changes of state', async () => {
      const state = await swapPathsSerializerService.serializeSwapPaths(
        blockchainId,
      );

      const tokens = await contractsService.getTokensByNames(blockchainId, [
        TOKEN_NAMES.BNB,
        TOKEN_NAMES.CAKE,
        TOKEN_NAMES.USDC,
        TOKEN_NAMES.BLID,
      ]);

      // update existing path
      state[PLATFORMS.BISWAP][tokens[0].name][tokens[tokens.length - 1].name] =
        tokens.map((token) => ({ name: token.name, address: token.address }));

      // create new path
      state[PLATFORMS.BISWAP][tokens[tokens.length - 1].name] = {};
      state[PLATFORMS.BISWAP][tokens[tokens.length - 1].name][tokens[0].name] =
        tokens
          .reverse()
          .map((token) => ({ name: token.name, address: token.address }));

      await swapPathsSerializerService.deserializeSwapPaths(
        blockchainId,
        state,
      );

      const newState = await swapPathsSerializerService.serializeSwapPaths(
        blockchainId,
      );

      expect(state).toEqual(newState);
    });
  });
});
