import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { PLATFORMS } from 'src/common/constants/platforms';
import { getPlatformByName } from 'src/common/utils/platforms';
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

import { STATE } from '../../../../test/evm/utils/constants/state';
import { SwapPathCreateDto } from '../dto/SwapPathCreateDto';
import { SwapPathUpdateDto } from '../dto/SwapPathUpdateDto';
import { SwapPathEntity } from '../swap-path.entity';
import { SwapPathContractsEntity } from '../swap-path-contracts.entity';
import { SwapPathsService } from '../swap-paths.service';

const testSwapPathData = {
  blockchainId: 1,
  platform: PLATFORMS.APESWAP,
  fromTokenId: 10,
  toTokenId: 8,
  innerPath: [5, 7, 2],
};

describe('The SwapPathsService', () => {
  let swapPathsService: SwapPathsService;
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
          SwapPathEntity,
          SwapPathContractsEntity,
          ContractEntity,
        ]),
      ],
      providers: [SwapPathsService, ContractsService],
    })
      .useMocker(() => ({}))
      .compile();

    swapPathsService = module.get<SwapPathsService>(SwapPathsService);

    connection = module.get<Connection>(Connection);
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('getPathForTokens', () => {
    let swapPathId: number;

    beforeEach(async () => {
      const { id } = await swapPathsService.createSwapPath(
        plainToInstance(SwapPathCreateDto, testSwapPathData),
      );
      swapPathId = id;
    });

    afterEach(async () => {
      await swapPathsService.removeSwapPathById(swapPathId);
    });

    it('should get path the same as from STATE', async () => {
      const bnbBlockchainId = 1;

      for (const [name, paltformPathes] of Object.entries(STATE.paths)) {
        const platform = getPlatformByName(name);

        if (!platform) {
          return null;
        }

        for (const [fromTokenName, fromTokenPathes] of Object.entries(
          paltformPathes,
        )) {
          for (const [toTokenName, expectedPath] of Object.entries(
            fromTokenPathes,
          )) {
            const actualPath = await swapPathsService.getPathForTokens(
              bnbBlockchainId,
              platform,
              fromTokenName,
              toTokenName,
            );

            expect(actualPath.join()).toEqual(
              (expectedPath as string[]).join(),
            );
          }
        }
      }
    });

    it('should create entity with a proper order of path', async () => {
      const actualData = await swapPathsService.getSwapPathById(swapPathId);

      expect(actualData).toMatchObject(testSwapPathData);
    });

    it('should update entity with a proper order of path', async () => {
      const innerPath = [11, 2];
      const updatedSwapPathData = { ...testSwapPathData, innerPath };

      await swapPathsService.updateSwapPathById(
        swapPathId,
        plainToInstance(SwapPathUpdateDto, { innerPath }),
      );
      const actualData = await swapPathsService.getSwapPathById(swapPathId);

      expect(actualData).toMatchObject(updatedSwapPathData);
    });

    it('should return correct path for BSW', async () => {
      const bnbBlockchainId = 1;

      const path = await swapPathsService.getPathForTokens(
        bnbBlockchainId,
        PLATFORMS.PANCAKESWAP,
        TOKEN_NAMES.BSW,
        TOKEN_NAMES.BLID,
      );

      expect(path).toStrictEqual(STATE.paths.Pancake.BSW.BLID);
    });

    it('should return null for an unregistered path', async () => {
      const bnbBlockchainId = 1;

      const path = await swapPathsService.getPathForTokens(
        bnbBlockchainId,
        PLATFORMS.PANCAKESWAP,
        TOKEN_NAMES.BSW,
        TOKEN_NAMES.FIL,
      );

      expect(path).toBeNull();
    });
  });
});
