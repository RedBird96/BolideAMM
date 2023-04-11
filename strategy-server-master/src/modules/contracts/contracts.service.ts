import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ClassConstructor } from 'class-transformer';
import { plainToInstance } from 'class-transformer';
import type { Farm } from 'src/modules/bnb/interfaces/farm.interface';
import type { FindConditions } from 'typeorm';
import { In, Repository } from 'typeorm';

import { ERROR_CODES } from '../../common/constants/error-codes';
import { PLATFORMS } from '../../common/constants/platforms';
import { LogicException } from '../../common/logic.exception';
import { CONTRACT_TYPES } from './constants/contract-types';
import { TOKEN_NAMES } from './constants/token-names';
import { ContractEntity } from './contract.entity';
import type { ContractCreateDto } from './dto/ContractCreateDto';
import type { ContractDataDto } from './dto/ContractDataDto';
import type { ContractDto } from './dto/ContractDto';
import type { ContractListOptionsDto } from './dto/ContractListOptionsDto';
import type { ContractUpdateDto } from './dto/ContractUpdateDto';
import { InnerTokenDto } from './dto/InnerTokenDataDto';
import { LpTokenDataDto } from './dto/LpTokenDataDto';
import { StrStorageDataDto } from './dto/StrStorageDataDto';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(ContractEntity)
    private readonly repository: Repository<ContractEntity>,
  ) {}

  async getContractById(contractId: number): Promise<ContractEntity | null> {
    return this.repository.findOne({ id: contractId });
  }

  async getContracts(data: ContractListOptionsDto): Promise<ContractEntity[]> {
    const qb = this.repository.createQueryBuilder('contracts');

    if (data.blockchainId) {
      qb.where({ blockchainId: data.blockchainId });
    }

    if (data.type) {
      qb.andWhere({ type: data.type });
    }

    if (data.platform) {
      qb.andWhere({ platform: data.platform });
    }

    if (data.name) {
      qb.andWhere({ name: data.name });
    }

    if (data.address) {
      qb.andWhere(`contracts.address ILIKE '%${data.address}%'`);
    }

    return qb.getMany();
  }

  async getContract(
    data: ContractListOptionsDto,
  ): Promise<ContractEntity | null> {
    const contracts = await this.getContracts(data);

    return contracts?.[0] || null;
  }

  async getContractAddress(data: ContractListOptionsDto): Promise<string> {
    const contract = await this.getContract(data);

    if (!contract) {
      throw new LogicException(
        ERROR_CODES.NOT_FOUND_CONTRACT({
          blockchainId: data.blockchainId,
          platform: data.platform,
          type: data.type,
        }),
      );
    }

    return contract.address;
  }

  async findOneEntityById(contractId: number): Promise<ContractEntity> {
    const contract = await this.repository.findOne(contractId);

    if (!contract) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_CONTRACT_BY_ID);
    }

    return contract;
  }

  async findOneById(contractId: number): Promise<ContractDto> {
    const contract = await this.findOneEntityById(contractId);

    return contract.toDto();
  }

  async createContract(data: ContractCreateDto): Promise<ContractDto> {
    const type = data.type;

    if (data.data) {
      data.data = this.parseContractData(type, data.data);
    }

    const contract = await this.repository.create({
      ...data,
    });

    await this.repository.save(contract);

    return contract.toDto();
  }

  async updateContractById(
    contractId: number,
    data: ContractUpdateDto,
  ): Promise<ContractDto> {
    const contract = await this.repository.findOne(contractId);

    if (!contract) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_CONTRACT_BY_ID);
    }

    const type = data.type || contract.type;

    if (data.data) {
      data.data = this.parseContractData(type, data.data);
    }

    await this.repository.update(contractId, data);

    const updatedContract = await this.repository.findOne(contractId);

    return updatedContract.toDto();
  }

  async createOrUpdateContract(
    data: ContractCreateDto,
  ): Promise<{ dto: ContractDto; isInserted: boolean }> {
    const type = data.type;

    if (data.data) {
      data.data = this.parseContractData(type, data.data);
    }

    const contract = await this.getContract({
      blockchainId: data.blockchainId,
      platform: data.platform,
      type: data.type,
      name: data.name,
    });

    if (contract) {
      const dto = await this.updateContractById(contract.id, data);

      return { dto, isInserted: false };
    }

    const dto = await this.createContract(data);

    return { dto, isInserted: true };
  }

  async deleteContract(contractId: number): Promise<void> {
    const res = await this.repository.delete({ id: contractId });

    if (!res.affected) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_CONTRACT_BY_ID);
    }
  }

  async getTokens(blockchainId: number): Promise<ContractEntity[]> {
    return this.getContracts({ blockchainId, type: CONTRACT_TYPES.TOKEN });
  }

  async getTokenByAddress(
    blockchainId: number,
    address: string,
  ): Promise<ContractEntity> {
    return this.getContract({
      blockchainId,
      type: CONTRACT_TYPES.TOKEN,
      address,
    });
  }

  async getTokenByName(
    blockchainId: number,
    name: string,
  ): Promise<ContractEntity> {
    return this.getContract({ blockchainId, type: CONTRACT_TYPES.TOKEN, name });
  }

  async getTokensByNames(
    blockchainId: number,
    names: string[],
  ): Promise<ContractEntity[]> {
    return this.repository
      .createQueryBuilder('contracts')
      .where({
        blockchainId,
        type: CONTRACT_TYPES.TOKEN,
        name: In(names),
      })
      .orderBy(this.buildOrderByFromArray(names, 'contracts.name'))
      .getMany();
  }

  async getBlidContract(blockchainId: number): Promise<ContractEntity> {
    return this.getTokenByName(blockchainId, TOKEN_NAMES.BLID);
  }

  async getInnerTokens(data: {
    blockchainId: number;
    platform?: PLATFORMS;
    name?: string;
    address?: string;
    baseTokenName?: string;
    baseTokenAddress?: string;
  }): Promise<ContractEntity[]> {
    const qb = this.repository.createQueryBuilder('contracts').where({
      blockchainId: data.blockchainId,
      type: CONTRACT_TYPES.INNER_TOKEN,
    });

    if (data.platform) {
      qb.andWhere({ platform: data.platform });
    }

    if (data.name) {
      qb.andWhere({ name: data.name });
    }

    if (data.address) {
      qb.andWhere(`contracts.address ILIKE '%${data.address}%'`);
    }

    if (data.baseTokenAddress) {
      qb.andWhere(
        `contracts.data->>'baseContractAddress' ILIKE '%${data.baseTokenAddress}%'`,
      );
    }

    if (data.baseTokenName) {
      qb.andWhere(`base_contracts.name = '${data.baseTokenName}'`);
    }

    return qb
      .innerJoin(
        'contracts',
        'base_contracts',
        "(contracts.data->'baseContractId')::int = base_contracts.id",
      )
      .getMany();
  }

  async getInnerToken(data: {
    blockchainId: number;
    platform?: PLATFORMS;
    name?: string;
    address?: string;
    baseTokenName?: string;
    baseTokenAddress?: string;
  }): Promise<ContractEntity | null> {
    const tokens = await this.getInnerTokens(data);

    return tokens.length > 0 ? tokens[0] : null;
  }

  async getVenusTokens(blockchainId: number): Promise<ContractEntity[]> {
    return this.getInnerTokens({ blockchainId, platform: PLATFORMS.VENUS });
  }

  async getVenusTokensByBaseTokenAdresses(
    blockchainId: number,
    addresses: string[],
  ): Promise<ContractEntity[]> {
    if (!addresses) {
      throw new LogicException(ERROR_CODES.NO_ADDRESSES);
    }

    const addressCondition = addresses.map((a) => `'${a}'`).join(',');

    return this.repository
      .createQueryBuilder('c')
      .where({
        blockchainId,
        type: CONTRACT_TYPES.INNER_TOKEN,
        platform: PLATFORMS.VENUS,
      })
      .andWhere(
        `c.data->>'baseContractAddress' ILIKE ANY(ARRAY[${addressCondition}])`,
      )
      .orderBy(
        this.buildOrderByFromArray(addresses, "c.data->>'baseContractAddress'"),
      )
      .getMany();
  }

  async getTokenByInnerToken(
    innerToken: ContractEntity,
  ): Promise<ContractEntity> {
    const baseTokenAddress = (innerToken.data as InnerTokenDto)
      .baseContractAddress;

    return this.getTokenByAddress(innerToken.blockchainId, baseTokenAddress);
  }

  getStorageTokensAddress(
    storageContract: ContractEntity | ContractDto,
  ): string[] {
    return (storageContract.data as StrStorageDataDto).approvedTokens;
  }

  async getStorageTokens(
    storageContract: ContractEntity | ContractDto,
  ): Promise<ContractEntity[]> {
    const { blockchainId } = storageContract;

    const approvedTokens = this.getStorageTokensAddress(storageContract);

    if (!approvedTokens) {
      throw new LogicException(
        ERROR_CODES.NO_APPROVED_TOKENS_IN_STORAGE_CONTRACT,
      );
    }

    const addressCondition = approvedTokens.map((a) => `'${a}'`).join(',');

    return this.repository
      .createQueryBuilder('contracts')
      .where({
        blockchainId,
        type: CONTRACT_TYPES.TOKEN,
      })
      .andWhere(`contracts.address ILIKE ANY(ARRAY[${addressCondition}])`)
      .getMany();
  }

  async getStorageToken(data: {
    address?: string;
    name?: string;
    storageContract: ContractEntity | ContractDto;
  }): Promise<ContractEntity> {
    const { address, name, storageContract } = data;

    const approvedTokens = await this.getStorageTokensAddress(storageContract);

    if (!approvedTokens) {
      throw new LogicException(
        ERROR_CODES.NO_APPROVED_TOKENS_IN_STORAGE_CONTRACT,
      );
    }

    const addressCondition = approvedTokens.map((a) => `'${a}'`).join(',');

    const qb = this.repository
      .createQueryBuilder('contracts')
      .where({
        blockchainId: storageContract.blockchainId,
        type: CONTRACT_TYPES.TOKEN,
      })
      .andWhere(`contracts.address ILIKE ANY(ARRAY[${addressCondition}])`);

    if (name) {
      qb.andWhere({ name });
    }

    if (address) {
      qb.andWhere(`contracts.address ILIKE '%${address}%'`);
    }

    return qb.getOne();
  }

  async getStorageTokenByAddress(
    address: string,
    storageContract: ContractEntity | ContractDto,
  ): Promise<ContractEntity> {
    return this.getStorageToken({ storageContract, address });
  }

  async getStorageTokenByName(
    name: string,
    storageContract: ContractEntity | ContractDto,
  ): Promise<ContractEntity> {
    return this.getStorageToken({ name, storageContract });
  }

  async getFarmContracts(blockchainId?: number): Promise<ContractEntity[]> {
    const where: FindConditions<ContractEntity> = {
      type: CONTRACT_TYPES.LP_TOKEN,
    };

    if (blockchainId) {
      where.blockchainId = blockchainId;
    }

    // eslint-disable-next-line unicorn/no-array-callback-reference
    return this.repository.find(where);
  }

  async getFarms(
    blockchainId: number,
    isDestructPairs = false,
  ): Promise<Farm[]> {
    const contracts = await this.getFarmContracts(blockchainId);

    const farms: Farm[] = [];

    for (const contract of contracts) {
      if (isDestructPairs) {
        const farm = await this.getFarmByContract(contract);
        farms.push(farm);
        continue;
      }

      if ((contract.data as LpTokenDataDto).isBorrowable) {
        const farm = await this.getFarmByContract(contract);
        farms.push(farm);
      }
    }

    return farms;
  }

  async getFarmByContractId(contractId: number): Promise<Farm> {
    const contract = await this.repository.findOneOrFail(contractId);

    return this.getFarmByContract(contract);
  }

  async getFarmByContract(contract: ContractEntity): Promise<Farm> {
    const data = contract.data as LpTokenDataDto;
    const fromToken = await this.repository.findOneOrFail(data.fromTokenId);
    const toToken = await this.repository.findOneOrFail(data.toTokenId);

    return {
      platform: contract.platform,
      pair: `${fromToken.name}-${toToken.name}`,
      token1: fromToken.name,
      token2: toToken.name,
      lpAddress: contract.address,
      asset1Address: fromToken.address,
      asset2Address: toToken.address,
      pid: data.pid,
      isBorrowable: data.isBorrowable,
    };
  }

  async getFarmPlatformsTokens(
    blockchainId: number,
  ): Promise<Map<PLATFORMS, ContractDto>> {
    const [cakeToken, bananaToken, bswToken] = await this.getTokensByNames(
      blockchainId,
      [TOKEN_NAMES.CAKE, TOKEN_NAMES.BANANA, TOKEN_NAMES.BSW],
    );

    return new Map([
      [PLATFORMS.PANCAKESWAP, cakeToken],
      [PLATFORMS.APESWAP, bananaToken],
      [PLATFORMS.BISWAP, bswToken],
    ]);
  }

  getUsdtBlidLpContract(blockchainId: number) {
    return this.getContract({
      blockchainId,
      type: CONTRACT_TYPES.LP_TOKEN,
      name: `${TOKEN_NAMES.USDT}-${TOKEN_NAMES.BLID}`,
    });
  }

  private buildOrderByFromArray(arr: string[], columnName: string): string {
    const orderByWhenCases = arr
      .map(
        (item, index) =>
          ` when upper(${columnName}) = '${item.toUpperCase()}' then ${index} `,
      )
      .join('');

    return `(case ${orderByWhenCases} else null end)`;
  }

  private parseContractData(
    type: CONTRACT_TYPES,
    data: ContractDataDto,
  ): ContractDataDto {
    let instanceData = {};

    let cls: ClassConstructor<ContractDataDto>;

    switch (type) {
      case CONTRACT_TYPES.INNER_TOKEN:
        cls = InnerTokenDto;
        break;
      case CONTRACT_TYPES.LP_TOKEN:
        cls = LpTokenDataDto;
        break;
      case CONTRACT_TYPES.STR_STORAGE:
        cls = StrStorageDataDto;
        break;
    }

    if (cls) {
      instanceData = plainToInstance(cls, data, {
        excludeExtraneousValues: true,
      });
    }

    return instanceData;
  }
}
