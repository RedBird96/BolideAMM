import { omit } from 'lodash';
import { ORDER } from 'src/common/constants/order';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';
import type { PageOptions } from 'src/common/interfaces/PageOptions';
import { getSkip } from 'src/common/utils/get-skip';
import { EntityRepository, Repository } from 'typeorm';

import { LbfStatsPageDto } from './dto/LbfStatsPageDto';
import type { StakedPortfolio } from './lbf-analytics.service';
import { LbfStatEntity } from './lbf-stat.entity';

interface LbfStatsPageOptions extends PageOptions {
  createdAtFrom?: Date;
  createdAtTo?: Date;
}

export interface SaveLbfStat {
  strategyId: number;

  amount: string;
  venusEarnAmount: string;
  farmingAmount: string;
  lendedAmount: string;
  borrowVsStakedAmount: string;
  borrowedAmount: string;
  stakedAmount: string;
  walletAmount: string;
  venusPercentLimit: string;

  walletInfo: Record<string, string>;
  farmingEarns: Record<string, string>;
  lendedTokens: Record<
    string,
    {
      diff: string;
      vTokenBalance: string;
    }
  >;
  borrowed: Record<string, string>;
  staked: Record<string, string>;
  borrowVsStaked: Record<string, number>;
  lendedTotal: string;
  stakedPortfolio: StakedPortfolio;
}

@EntityRepository(LbfStatEntity)
export class LbfStatsRepository extends Repository<LbfStatEntity> {
  saveLbfStat(data: SaveLbfStat): Promise<LbfStatEntity> {
    return this.save(data);
  }

  async getLbfStats(
    pageOptionsDto: LbfStatsPageOptions,
  ): Promise<LbfStatsPageDto> {
    const queryBuilder = this.createQueryBuilder('lbf_stats');

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

    orderBy[`lbf_stats.${orderField}`] = order;

    queryBuilder.where(where);

    if (createdAtFrom) {
      queryBuilder.andWhere(`lbf_stats.createdAt >= '${createdAtFrom}'`);
    }

    if (createdAtTo) {
      queryBuilder.andWhere(`lbf_stats.createdAt <= '${createdAtTo}'`);
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

    return new LbfStatsPageDto(dtoItems, pageMetaDto);
  }
}
