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

import { CONTRACT_TYPES } from '../constants/contract-types';
import type { ContractDto } from '../dto/ContractDto';
import type { InnerTokenDto } from '../dto/InnerTokenDataDto';

const blockchainId = 1;

jest.setTimeout(20_000);

describe('The ContractsService', () => {
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
        TypeOrmModule.forFeature([ContractEntity]),
      ],
      providers: [ContractsService],
    })
      .useMocker(() => ({}))
      .compile();

    contractsService = module.get<ContractsService>(ContractsService);

    connection = module.get<Connection>(Connection);
  });

  afterAll(async () => {
    await connection.close();
  });

  describe('getContracts', () => {
    it('filter by `type` worked', async () => {
      const type = CONTRACT_TYPES.TOKEN;
      const tokens = await contractsService.getContracts({
        blockchainId,
        type,
      });

      for (const token of tokens) {
        expect(token.type).toEqual(type);
      }
    });

    it('filter by `platform` worked', async () => {
      const platform = PLATFORMS.VENUS;
      const tokens = await contractsService.getContracts({
        blockchainId,
        platform,
      });

      for (const token of tokens) {
        expect(token.platform).toEqual(platform);
      }
    });

    it('filter by `name` worked', async () => {
      const name = TOKEN_NAMES.BUSD;
      const tokens = await contractsService.getContracts({
        blockchainId,
        name,
      });

      expect(tokens.length).toEqual(1);
      expect(tokens[0].name).toEqual(name);
    });

    it('filter by `address` worked', async () => {
      let address = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
      let tokens = await contractsService.getContracts({
        blockchainId,
        address,
      });

      expect(tokens.length).toEqual(1);
      expect(tokens[0].address).toEqual(address);

      address = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
      tokens = await contractsService.getContracts({
        blockchainId,
        address,
      });

      expect(tokens.length).toEqual(1);
      expect(tokens[0].address).toEqual(address);
    });
  });

  describe('getTokensByNames', () => {
    it('returns tokens in a proper order', async () => {
      const names = ['BSW', 'BNB', 'BLID'];
      const tokens = await contractsService.getTokensByNames(
        blockchainId,
        names,
      );

      expect(tokens.length).toEqual(names.length);

      for (const [i, token] of tokens.entries()) {
        expect(token.name).toEqual(names[i]);
      }
    });
  });

  describe('getInnerTokens', () => {
    it('filter by `platform` worked', async () => {
      const platform = PLATFORMS.VENUS;
      const tokens = await contractsService.getInnerTokens({
        blockchainId,
        platform,
      });

      for (const token of tokens) {
        expect(token.platform).toEqual(platform);
      }
    });

    it('filter by `name` worked', async () => {
      const name = `v${TOKEN_NAMES.BUSD}`;
      const tokens = await contractsService.getInnerTokens({
        blockchainId,
        name,
      });

      expect(tokens.length).toEqual(1);
      expect(tokens[0].name).toEqual(name);
    });

    it('filter by `address` worked', async () => {
      const address = '0x95c78222B3D6e262426483D42CfA53685A67Ab9D';
      const tokens = await contractsService.getInnerTokens({
        blockchainId,
        address,
      });

      expect(tokens.length).toEqual(1);
      expect(tokens[0].address).toEqual(address);
    });

    it('filter by `baseTokenName` worked', async () => {
      const baseTokenName = TOKEN_NAMES.BUSD;
      const tokens = await contractsService.getInnerTokens({
        blockchainId,
        baseTokenName,
      });

      expect(tokens.length).toEqual(1);
      expect(tokens[0].name).toEqual(`v${baseTokenName}`);
    });

    it('filter by `baseTokenAddress` worked', async () => {
      let baseTokenAddress = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
      let tokens = await contractsService.getInnerTokens({
        blockchainId,
        baseTokenAddress,
      });

      expect(tokens.length).toEqual(1);
      expect((tokens[0].data as InnerTokenDto).baseContractAddress).toEqual(
        baseTokenAddress,
      );

      baseTokenAddress = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
      tokens = await contractsService.getInnerTokens({
        blockchainId,
        baseTokenAddress,
      });

      expect(tokens.length).toEqual(1);
      expect((tokens[0].data as InnerTokenDto).baseContractAddress).toEqual(
        baseTokenAddress,
      );
    });
  });

  describe('getVenusTokensByBaseTokenAdresses', () => {
    it('returns tokens in a proper order', async () => {
      const addresses = [
        '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
        '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
        '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
      ];
      const tokens = await contractsService.getVenusTokensByBaseTokenAdresses(
        blockchainId,
        addresses,
      );

      expect(tokens.length).toEqual(addresses.length);

      for (const [i, token] of tokens.entries()) {
        expect((token.data as InnerTokenDto).baseContractAddress).toEqual(
          addresses[i],
        );
      }
    });

    it('returns tokens in a proper order ignore case', async () => {
      const addresses = [
        '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
        '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
        '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
      ];
      const tokens = await contractsService.getVenusTokensByBaseTokenAdresses(
        blockchainId,
        addresses,
      );

      expect(tokens.length).toEqual(addresses.length);

      for (const [i, token] of tokens.entries()) {
        expect((token.data as InnerTokenDto).baseContractAddress).toEqual(
          addresses[i],
        );
      }
    });
  });

  describe('getStorageToken', () => {
    let storageContractMock: ContractDto = {} as ContractDto;

    beforeAll(async () => {
      const name = TOKEN_NAMES.BUSD;

      const busdToken = await contractsService.getContract({
        blockchainId,
        name,
      });

      storageContractMock = {
        id: 1,
        blockchainId,
        type: CONTRACT_TYPES.STR_STORAGE,
        name: 'mock storage',
        address: '',
        data: {
          approvedTokens: [busdToken.address],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    it('filter by `name` worked', async () => {
      const name = TOKEN_NAMES.BUSD;
      const token = await contractsService.getStorageToken({
        storageContract: storageContractMock,
        name,
      });

      expect(token.name).toEqual(name);
    });

    it('filter by `address` worked', async () => {
      let address = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
      let token = await contractsService.getStorageToken({
        storageContract: storageContractMock,
        address,
      });

      expect(token.address).toEqual(address);

      address = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
      token = await contractsService.getStorageToken({
        storageContract: storageContractMock,
        address,
      });

      expect(token.address).toEqual(address);
    });

    it('should not find if token is not approved of storage', async () => {
      const address = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';
      const token = await contractsService.getStorageToken({
        storageContract: storageContractMock,
        address,
      });

      expect(token).toBeUndefined();
    });
  });

  describe('createOrUpdateContract', () => {
    const data = {
      blockchainId,
      type: CONTRACT_TYPES.INNER_TOKEN,
      platform: PLATFORMS.VENUS,
      name: 'vTEST',
      address: '0x1',
      data: {
        baseContractId: 1,
        baseContractAddress: '0x2',
      },
    };

    let contractId = 0;

    it('should create new contract if it is not existed', async () => {
      const { dto } = await contractsService.createOrUpdateContract(data);
      contractId = dto.id;

      expect(dto).toMatchObject(data);
    });

    it('should update an existing contract', async () => {
      const updatedData = {
        ...data,
        address: '0x3',
        data: { baseContractId: 2, baseContractAddress: '0x4' },
      };

      const { dto } = await contractsService.createOrUpdateContract(
        updatedData,
      );

      expect(dto.id).toEqual(contractId);
      expect(dto).toMatchObject(updatedData);
    });
  });
});
