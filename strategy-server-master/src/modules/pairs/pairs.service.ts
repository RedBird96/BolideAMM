import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { ORDER } from 'src/common/constants/order';
import { PLATFORMS } from 'src/common/constants/platforms';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';
import { LogicException } from 'src/common/logic.exception';
import { getSkip } from 'src/common/utils/get-skip';
import type { PancakeFarm } from 'src/modules/bnb/pancake/pancake-eth.service';
import { Repository } from 'typeorm';
import type Web3 from 'web3';

import { ApeSwapEthService } from '../bnb/apeswap/apeswap-eth.serivce';
import { BiswapEthService } from '../bnb/biswap/biswap-eth.service';
import type { PancakePoolInfo } from '../bnb/farm/farm-analytics.service';
import { FarmAnalyticService } from '../bnb/farm/farm-analytics.service';
import type { Farm } from '../bnb/interfaces/farm.interface';
import { CONTRACT_TYPES } from '../contracts/constants/contract-types';
import { ContractEntity } from '../contracts/contract.entity';
import { ContractsService } from '../contracts/contracts.service';
import { LpTokenDataDto } from '../contracts/dto/LpTokenDataDto';
import { StrategiesService } from '../strategies/strategies.service';
import type { CreatePairOptionsDto } from './dto/CreatePairOptionsDto';
import { PairDto } from './dto/PairDto';
import { PairListDto } from './dto/PairListDto';
import type { PairListOptionsDto } from './dto/PairListOptionsDto';

@Injectable()
export class PairsService {
  private readonly logger = new Logger(PairsService.name);

  constructor(
    @InjectRepository(ContractEntity)
    private readonly repository: Repository<ContractEntity>,
    private readonly apeSwapEthService: ApeSwapEthService,
    private readonly biswapEthService: BiswapEthService,
    @Inject(forwardRef(() => StrategiesService))
    private readonly strategiesService: StrategiesService,
    private readonly contractsService: ContractsService,
    private readonly farmAnalyticService: FarmAnalyticService,
  ) {}

  async findOneById(id: number): Promise<PairDto> {
    const pairContract = await this.repository.findOne({
      id,
      type: CONTRACT_TYPES.LP_TOKEN,
    });

    if (!pairContract) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_PAIR);
    }

    const farm = await this.contractsService.getFarmByContract(pairContract);

    return new PairDto(pairContract, farm);
  }

  async getPairs(pageOptionsDto: PairListOptionsDto): Promise<PairListDto> {
    const queryBuilder = this.repository.createQueryBuilder('contracts').where({
      type: CONTRACT_TYPES.LP_TOKEN,
    });

    const {
      order = ORDER.DESC,
      orderField = 'createdAt',
      page,
      take,
    } = pageOptionsDto;

    const orderBy = {};

    orderBy[`contracts.${orderField}`] = order;

    const { blockchainId, platform } = pageOptionsDto;

    if (blockchainId) {
      queryBuilder.andWhere({ blockchainId });
    }

    if (platform) {
      queryBuilder.andWhere({ platform });
    }

    const [contracts, contractsCount] = await queryBuilder
      .orderBy(orderBy)
      .skip(getSkip(page, take))
      .take(take)
      .getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      pageOptionsDto,
      itemCount: contractsCount,
    });

    const dtos = [];

    for (const item of contracts) {
      const farm = await this.contractsService.getFarmByContract(item);
      dtos.push(new PairDto(item, farm));
    }

    return new PairListDto(dtos, pageMetaDto);
  }

  async getUniquePairs(): Promise<PairDto[]> {
    const contracts = await this.contractsService.getFarmContracts();

    const uniqueMap: Record<string, PairDto> = {};

    for (const contract of contracts) {
      const farm = await this.contractsService.getFarmByContract(contract);
      uniqueMap[farm.pair] = new PairDto(contract, farm);
    }

    return Object.values(uniqueMap);
  }

  async saveOrUpdatePair(data: CreatePairOptionsDto): Promise<PairDto> {
    const qb = this.repository
      .createQueryBuilder('contracts')
      .innerJoin(
        'contracts',
        'from_c',
        "(contracts.data->'fromTokenId')::int = from_c.id",
      )
      .innerJoin(
        'contracts',
        'to_c',
        "(contracts.data->'toTokenId')::int = to_c.id",
      )
      .where({
        blockchainId: data.blockchainId,
        platform: data.platform,
        type: CONTRACT_TYPES.LP_TOKEN,
      })
      .andWhere('from_c.name = :fromTokenName', {
        fromTokenName: data.fromTokenName,
      })
      .andWhere('to_c.name = :toTokenName', { toTokenName: data.toTokenName });

    let entity = await qb.getOne();

    if (!entity) {
      const [fromToken, toToken] = await this.contractsService.getTokensByNames(
        data.blockchainId,
        [data.fromTokenName, data.toTokenName],
      );

      entity = new ContractEntity();
      entity.blockchainId = data.blockchainId;
      entity.platform = data.platform;
      entity.type = CONTRACT_TYPES.LP_TOKEN;
      entity.name = `${data.fromTokenName}-${data.toTokenName}`;

      const lpData = new LpTokenDataDto();
      lpData.fromTokenId = fromToken.id;
      lpData.toTokenId = toToken.id;

      entity.data = lpData;
    }

    entity.address = data.address;
    (entity.data as LpTokenDataDto).pid = data.pid;

    await this.repository.save(entity);

    const farm = await this.contractsService.getFarmByContract(entity);

    return new PairDto(entity, farm);
  }

  async removeAllByPlatform(platform: PLATFORMS) {
    const pairContracts = await this.contractsService.getContracts({
      type: CONTRACT_TYPES.LP_TOKEN,
      platform,
    });

    for (const pairContract of pairContracts) {
      await this.strategiesService.softDeletePair(pairContract.id);
      await this.contractsService.deleteContract(pairContract.id);
    }
  }

  async getPancakeFarms(web3: Web3): Promise<PancakeFarm[]> {
    this.logger.debug({ message: 'executing getFarms' });

    const farmPools = await this.farmAnalyticService.getFarmPools({
      platform: PLATFORMS.PANCAKESWAP,
      web3,
    });

    return farmPools.map((farmPool) => {
      const farm = this.farmAnalyticService.farmPoolToFarm(farmPool);

      return {
        ...farm,
        isRegular: (farmPool.pool as PancakePoolInfo).isRegular,
      };
    });
  }

  async reloadPairs(data: {
    blockchainId: number;
    platform: PLATFORMS;
    web3: Web3;
  }) {
    const { blockchainId, platform, web3 } = data;
    let farms: Farm[] = [];

    switch (platform) {
      case PLATFORMS.PANCAKESWAP:
        farms = await this.getPancakeFarms(web3);
        break;
      case PLATFORMS.APESWAP:
        farms = await this.apeSwapEthService.getFarms(web3);
        break;
      case PLATFORMS.BISWAP:
        farms = await this.biswapEthService.getFarms(web3);
        break;
    }

    for (const farm of farms) {
      try {
        await this.saveOrUpdatePair({
          blockchainId,
          platform,
          address: farm.lpAddress,
          fromTokenName: farm.token1,
          toTokenName: farm.token2,
          pid: farm.pid,
        });
      } catch (error) {
        this.logger.error({ message: 'saveOrUpdatePair', error, farm });
      }
    }
  }
}
