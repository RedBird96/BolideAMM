import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import type { PLATFORMS } from 'src/common/constants/platforms';
import type { SelectQueryBuilder } from 'typeorm';
import { Repository } from 'typeorm';
import { Transactional } from 'typeorm-transactional-cls-hooked';

import { ORDER } from '../../common/constants/order';
import { PageMetaDto } from '../../common/dto/PageMetaDto';
import { getSkip } from '../../common/utils/get-skip';
import { ContractsService } from '../contracts/contracts.service';
import type { LpTokenDataDto } from '../contracts/dto/LpTokenDataDto';
import { SwapPathCreateDto } from './dto/SwapPathCreateDto';
import type { SwapPathDto } from './dto/SwapPathDto';
import { SwapPathListDto } from './dto/SwapPathListDto';
import type { SwapPathListOptionsDto } from './dto/SwapPathListOptionsDto';
import { SwapPathUpdateDto } from './dto/SwapPathUpdateDto';
import { SwapPathEntity } from './swap-path.entity';
import { SwapPathContractsEntity } from './swap-path-contracts.entity';

const SWAP_PATH_COLUMNS =
  'sp.id, sp.blockchain_id, sp.platform, sp.from_token_id, sp.to_token_id, sp.created_at, sp.updated_at';

interface SwapPathInsertedResult {
  dto: SwapPathDto;
  isInserted: boolean;
}

@Injectable()
export class SwapPathsService {
  constructor(
    @InjectRepository(SwapPathEntity)
    private readonly repository: Repository<SwapPathEntity>,
    @InjectRepository(SwapPathContractsEntity)
    private readonly swapPathContractsRepository: Repository<SwapPathContractsEntity>,
    private readonly contractsService: ContractsService,
  ) {}

  async getPathForTokens(
    blockchainId: number,
    platform: PLATFORMS,
    fromTokenSymbol: string,
    toTokenSymbol: string,
  ): Promise<string[]> {
    // TODO: Query via repository gets wrong order of relations.
    // With typeorm > 3 it can be written via repository methods.
    // https://github.com/typeorm/typeorm/issues/2620#issuecomment-415105642
    const res = await this.repository
      .createQueryBuilder('sp')
      .innerJoin('contracts', 'c_from', 'sp.from_token_id = c_from.id')
      .innerJoin('contracts', 'c_to', 'sp.to_token_id = c_to.id')
      .leftJoin('swap_paths_contracts', 'spc', 'spc.swap_path_id = sp.id')
      .leftJoin('contracts', 'c', 'spc.contracts_id = c.id')
      .where('sp.blockchain_id = :blockchainId', { blockchainId })
      .andWhere('sp.platform = :platform', { platform })
      .andWhere('c_from.name = :fromToken', { fromToken: fromTokenSymbol })
      .andWhere('c_to.name = :toToken', { toToken: toTokenSymbol })
      .select(
        'c_from.address as from_address, c_to.address as to_address, array_remove(array_agg(c.address ORDER BY spc.id), NULL) as inner_path',
      )
      .groupBy('c_from.address, c_to.address')
      .execute();

    if (res.length === 0) {
      return null;
    }

    const path = res[0];

    return [path.from_address, ...path.inner_path, path.to_address];
  }

  async getSwapPathsQuery(
    data: Partial<SwapPathListOptionsDto>,
  ): Promise<SelectQueryBuilder<SwapPathEntity>> {
    const {
      blockchainId,
      platform,
      fromTokenId,
      toTokenId,
      order = ORDER.DESC,
      orderField = 'createdAt',
    } = data;

    const orderBy: any = {};

    orderBy[`sp.${orderField}`] = order;

    const qb = this.repository
      .createQueryBuilder('sp')
      .where('sp.blockchain_id = :blockchainId', {
        blockchainId,
      });

    if (platform) {
      qb.andWhere('sp.platform = :platform', {
        platform,
      });
    }

    if (fromTokenId) {
      qb.innerJoin('contracts', 'c_from', 'sp.from_token_id = c_from.id');
      qb.andWhere('c_from.id = :fromTokenId', {
        fromTokenId,
      });
    }

    if (toTokenId) {
      qb.innerJoin('contracts', 'c_to', 'sp.to_token_id = c_to.id');
      qb.andWhere('c_to.id = :toTokenId', { toTokenId });
    }

    // TODO: Query via repository gets wrong order of relations.
    // With typeorm > 3 it can be written via repository methods.
    // https://github.com/typeorm/typeorm/issues/2620#issuecomment-415105642
    return qb
      .leftJoin('swap_paths_contracts', 'spc', 'spc.swap_path_id = sp.id')
      .leftJoin('contracts', 'c', 'spc.contracts_id = c.id')
      .select(
        `${SWAP_PATH_COLUMNS}, array_remove(array_agg(c.id ORDER BY spc.id), NULL) as inner_path`,
      )
      .groupBy(`${SWAP_PATH_COLUMNS}`)
      .orderBy(orderBy);
  }

  async getSwapPaths(
    data: Partial<SwapPathListOptionsDto>,
  ): Promise<SwapPathDto[]> {
    const query = await this.getSwapPathsQuery(data);

    const res = await query.execute();

    return res.map((item) => this.queryResultToDto(item));
  }

  async getItems(
    pageOptionsDto: SwapPathListOptionsDto,
  ): Promise<SwapPathListDto> {
    const { page, take } = pageOptionsDto;

    const query = await this.getSwapPathsQuery(pageOptionsDto);

    const itemCount = await query.getCount();

    const items = await query.offset(getSkip(page, take)).limit(take).execute();

    const dtos = items.map((item) => this.queryResultToDto(item));

    const pageMetaDto = new PageMetaDto({
      pageOptionsDto,
      itemCount,
    });

    return new SwapPathListDto(dtos, pageMetaDto);
  }

  async getSwapPathById(id: number): Promise<SwapPathDto> {
    // TODO: Query via repository gets wrong order of relations.
    // With typeorm > 3 it can be written via repository methods.
    // https://github.com/typeorm/typeorm/issues/2620#issuecomment-415105642
    const res = await this.repository
      .createQueryBuilder('sp')
      .leftJoin('swap_paths_contracts', 'spc', 'spc.swap_path_id = sp.id')
      .leftJoin('contracts', 'c', 'spc.contracts_id = c.id')
      .select(
        `${SWAP_PATH_COLUMNS}, array_remove(array_agg(c.id ORDER BY spc.id), NULL) as inner_path`,
      )
      .where('sp.id = :id', { id })
      .groupBy(`${SWAP_PATH_COLUMNS}`)
      .execute();

    return this.queryResultToDto(res[0]);
  }

  @Transactional()
  async createSwapPath(data: SwapPathCreateDto): Promise<SwapPathDto> {
    const swapPath = new SwapPathEntity();
    swapPath.blockchainId = data.blockchainId;
    swapPath.platform = data.platform;
    swapPath.fromTokenId = data.fromTokenId;
    swapPath.toTokenId = data.toTokenId;
    swapPath.innerPath = [];

    await this.repository.save(swapPath);

    for (const tokenId of data.innerPath) {
      const swapPathContract = await this.swapPathContractsRepository.save({
        swapPathId: swapPath.id,
        contractId: tokenId,
      });

      swapPath.innerPath.push(swapPathContract);
    }

    return swapPath.toDto();
  }

  @Transactional()
  async updateSwapPathById(
    id: number,
    data: SwapPathUpdateDto,
  ): Promise<SwapPathDto> {
    await this.swapPathContractsRepository.delete({ swapPathId: id });

    const innerPath = [];

    for (const tokenId of data.innerPath) {
      const swapPathContract = await this.swapPathContractsRepository.save({
        swapPathId: id,
        contractId: tokenId,
      });

      innerPath.push(swapPathContract);
    }

    const res = await this.repository.findOneOrFail({ id });
    res.innerPath = innerPath;

    return res.toDto();
  }

  @Transactional()
  async removeSwapPathById(id: number): Promise<void> {
    await this.swapPathContractsRepository.delete({ swapPathId: id });

    await this.repository.delete({ id });
  }

  async garanteeSwapPathsForFarms(): Promise<SwapPathDto[]> {
    const contracts = await this.contractsService.getFarmContracts();

    const result: SwapPathDto[] = [];

    for (const contract of contracts) {
      const { fromTokenId, toTokenId } = contract.data as LpTokenDataDto;

      const { forward, backward } =
        await this.createSwapPathForTokensIfNotExists({
          blockchainId: contract.blockchainId,
          platform: contract.platform,
          fromTokenId,
          toTokenId,
        });

      if (forward.isInserted) {
        result.push(forward.dto);
      }

      if (backward.isInserted) {
        result.push(backward.dto);
      }
    }

    return result;
  }

  async createSwapPathForTokensIfNotExists(data: {
    blockchainId: number;
    platform: PLATFORMS;
    fromTokenId: number;
    toTokenId: number;
  }): Promise<{
    forward: SwapPathInsertedResult;
    backward: SwapPathInsertedResult;
  }> {
    const forward = await this.createSwapPathIfNotExists(data);

    const backward = await this.createSwapPathIfNotExists({
      blockchainId: data.blockchainId,
      platform: data.platform,
      fromTokenId: data.toTokenId,
      toTokenId: data.fromTokenId,
    });

    return { forward, backward };
  }

  async createSwapPathIfNotExists(data: {
    blockchainId: number;
    platform: PLATFORMS;
    fromTokenId: number;
    toTokenId: number;
  }): Promise<SwapPathInsertedResult> {
    const swapPath = await this.repository.findOne(data, {
      relations: ['innerPath'],
    });

    if (swapPath) {
      return { dto: swapPath.toDto(), isInserted: false };
    }

    const dto = await this.createSwapPath({ ...data, innerPath: [] });

    return { dto, isInserted: true };
  }

  private queryResultToDto(data: any): SwapPathDto {
    return plainToInstance(SwapPathEntity, {
      id: data.id,
      platform: data.platform,
      blockchainId: data.blockchain_id,
      fromTokenId: data.from_token_id,
      toTokenId: data.to_token_id,
      innerPath: data.inner_path.map((address) => ({ contractId: address })),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }).toDto();
  }
}
