import { omit } from 'lodash';
import { ORDER } from 'src/common/constants/order';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';
import { getSkip } from 'src/common/utils/get-skip';
import { Repository } from 'typeorm';
import { EntityRepository } from 'typeorm/decorator/EntityRepository';

import { StrategyPairListDto } from './dto/StrategyPairListDto';
import type { StrategyPairListOptionsDto } from './dto/StrategyPairListOptionsDto';
import { StrategyPairEntity } from './strategy-pair.entity';

@EntityRepository(StrategyPairEntity)
export class StrategyPairRepository extends Repository<StrategyPairEntity> {
  async getItemsWithPairs(
    strategyId: number,
    pageOptionsDto: StrategyPairListOptionsDto,
  ): Promise<StrategyPairListDto> {
    const queryBuilder = this.createQueryBuilder('strategy_pairs');

    const where: any = omit(pageOptionsDto, [
      'skip',
      'take',
      'order',
      'page',
      'orderField',
      'search',
      'roles',
    ]);

    const {
      order = ORDER.DESC,
      orderField = 'createdAt',
      page,
      take,
    } = pageOptionsDto;

    const orderBy: any = {};

    if (strategyId) {
      where.strategyId = strategyId;
    }

    orderBy[`strategy_pairs.${orderField}`] = order;

    queryBuilder.leftJoinAndSelect(
      'strategy_pairs.pair',
      'contracts',
      'strategy_pairs.pair_id = contracts.id',
    );
    queryBuilder.where(where);

    const [strategyPairs, strategyPairsCount] = await queryBuilder
      .orderBy(orderBy)
      .skip(getSkip(page, take))
      .take(take)
      .getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      pageOptionsDto,
      itemCount: strategyPairsCount,
    });

    const dtos = [];

    for (const item of strategyPairs) {
      dtos.push(item.toDto());
    }

    return new StrategyPairListDto(dtos, pageMetaDto);
  }

  async deleteAll() {
    return this.delete({});
  }
}
