import { omit } from 'lodash';
import { ORDER } from 'src/common/constants/order';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';
import type { PageOptions } from 'src/common/interfaces/PageOptions';
import { getSkip } from 'src/common/utils/get-skip';
import { EntityRepository, Repository } from 'typeorm';

import { FarmStatsPageDto } from './dto/FarmStatsPageDto';
import { FarmStatEntity } from './farm-stat.entity';

interface FarmStatsPageOptions extends PageOptions {
  createdAtFrom?: Date;
  createdAtTo?: Date;
}

@EntityRepository(FarmStatEntity)
export class FarmStatsRepository extends Repository<FarmStatEntity> {
  saveFarmStat(data: {
    token1: string;
    token2: string;
    market: string;
    pair: string;
    lpAddress: string;
    apr: string;
    poolLiquidityUsd: string;
    poolWeight: string;
    lpPrice: string;
    token1Liquidity: string;
    token1Price: string;
    token2Liquidity: string;
    token2Price: string;
    totalSupply: string;
  }): Promise<FarmStatEntity> {
    return this.save(data);
  }

  async getFarmStats(
    pageOptionsDto: FarmStatsPageOptions,
  ): Promise<FarmStatsPageDto> {
    const queryBuilder = this.createQueryBuilder('farm-stat');

    const where: any = omit(pageOptionsDto, [
      'skip',
      'take',
      'order',
      'page',
      'orderField',
    ]);

    const {
      createdAtFrom,
      createdAtTo,
      order = ORDER.DESC,
      orderField = 'createdAt',
      page,
      take,
    } = pageOptionsDto;

    const orderBy: any = {};

    orderBy[`farm-stat.${orderField}`] = order;

    queryBuilder.where(where);

    if (createdAtFrom) {
      queryBuilder.andWhere(`farm-stat.createdAt >= '${createdAtFrom}'`);
    }

    if (createdAtTo) {
      queryBuilder.andWhere(`farm-stat.createdAt <= '${createdAtTo}'`);
    }

    const [items, itemCount] = await queryBuilder
      .orderBy(orderBy)
      .skip(getSkip(page, take))
      .take(take)
      .getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      pageOptionsDto,
      itemCount,
    });

    const dtoItems = [];

    for (const item of items) {
      dtoItems.push(item.toDto());
    }

    return new FarmStatsPageDto(dtoItems, pageMetaDto);
  }
}
