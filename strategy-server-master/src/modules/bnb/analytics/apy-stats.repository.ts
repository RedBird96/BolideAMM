import { omit } from 'lodash';
import { ORDER } from 'src/common/constants/order';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';
import type { PageOptions } from 'src/common/interfaces/PageOptions';
import { getSkip } from 'src/common/utils/get-skip';
import { EntityRepository, Repository } from 'typeorm';

import { ApyStatEntity } from './apy-stat.entity';
import { ApyStatsPageDto } from './dto/ApyStatsPageDto';

export interface ApyStatsPageOptions extends PageOptions {
  createdAtFrom?: Date;
  createdAtTo?: Date;
}

@EntityRepository(ApyStatEntity)
export class ApyStatsRepository extends Repository<ApyStatEntity> {
  saveApyStat(
    strategyId: number,
    apy: Record<any, any>,
  ): Promise<ApyStatEntity> {
    return this.save({
      strategyId,
      ...apy,
    });
  }

  async getApyStats(
    pageOptionsDto: ApyStatsPageOptions,
  ): Promise<ApyStatsPageDto> {
    const queryBuilder = this.createQueryBuilder('apy_stats');

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

    orderBy[`apy_stats.${orderField}`] = order;

    queryBuilder.where(where);

    if (createdAtFrom) {
      queryBuilder.andWhere(`apy_stats.createdAt >= '${createdAtFrom}'`);
    }

    if (createdAtTo) {
      queryBuilder.andWhere(`apy_stats.createdAt <= '${createdAtTo}'`);
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

    return new ApyStatsPageDto(dtoItems, pageMetaDto);
  }
}
