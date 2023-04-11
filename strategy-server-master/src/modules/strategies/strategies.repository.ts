import { omit } from 'lodash';
import { ORDER } from 'src/common/constants/order';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';
import { getSkip } from 'src/common/utils/get-skip';
import { Repository } from 'typeorm';
import { EntityRepository } from 'typeorm/decorator/EntityRepository';

import { StrategyListDto } from './dto/StrategyListDto';
import type { StrategyListOptionsDto } from './dto/StrategyListOptionsDto';
import { StrategyEntity } from './strategy.entity';

@EntityRepository(StrategyEntity)
export class StrategiesRepository extends Repository<StrategyEntity> {
  async getItems(
    pageOptionsDto: StrategyListOptionsDto,
  ): Promise<StrategyListDto> {
    const queryBuilder = this.createQueryBuilder('strategies');

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

    orderBy[`strategies.${orderField}`] = order;

    queryBuilder.where(where);

    const [strategys, strategysCount] = await queryBuilder
      .orderBy(orderBy)
      .skip(getSkip(page, take))
      .take(take)
      .getManyAndCount();

    const pageMetaDto = new PageMetaDto({
      pageOptionsDto,
      itemCount: strategysCount,
    });

    const dtos = [];

    for (const item of strategys) {
      dtos.push(item.toDto());
    }

    return new StrategyListDto(dtos, pageMetaDto);
  }
}
