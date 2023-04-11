import { omit } from 'lodash';
import { ORDER } from 'src/common/constants/order';
import type { PLATFORMS } from 'src/common/constants/platforms';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';
import type { PageOptions } from 'src/common/interfaces/PageOptions';
import { getSkip } from 'src/common/utils/get-skip';
import { EntityRepository, Repository } from 'typeorm';

import { LendingStatsPageDto } from './dto/LendigStatsPageDto';
import type { LendingStatDto } from './dto/LendingStatDto';
import { LendingStatEntity } from './lending-stat.entity';

export interface LendingStatsPageOptions extends PageOptions {
  createdAtFrom?: Date;
  createdAtTo?: Date;
}

@EntityRepository(LendingStatEntity)
export class LendingStatsRepository extends Repository<LendingStatEntity> {
  saveLendingStat(data: Record<any, any>): Promise<LendingStatEntity> {
    return this.save(data);
  }

  async getLatestLendingTokenInfo(data: {
    platform: PLATFORMS;
    token: string;
  }): Promise<LendingStatDto> {
    const result = await this.findOne(data, {
      order: {
        createdAt: ORDER.DESC,
      },
    });

    return result ? result.toDto() : null;
  }

  async getLendingStats(
    pageOptionsDto: LendingStatsPageOptions,
  ): Promise<LendingStatsPageDto> {
    const queryBuilder = this.createQueryBuilder('lending-stat');

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

    orderBy[`lending-stat.${orderField}`] = order;

    queryBuilder.where(where);

    if (createdAtFrom) {
      queryBuilder.andWhere(`lending-stat.createdAt >= '${createdAtFrom}'`);
    }

    if (createdAtTo) {
      queryBuilder.andWhere(`lending-stat.createdAt <= '${createdAtTo}'`);
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

    return new LendingStatsPageDto(dtoItems, pageMetaDto);
  }
}
