import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { groupBy } from 'lodash';

import { UtilsService } from '../../../providers/utils.service';
import type { HistoryOptionsDto } from '../../external-api/dto/HistoryOptions';
import type { TvlHistoryDto } from './dto/TvlHistoryDto';
import { TvlHistoryRepository } from './tvl-history.repository';

@Injectable()
export class TvlHistoryService {
  private readonly logger = new Logger(TvlHistoryService.name);

  constructor(private readonly tvlHistoryRepository: TvlHistoryRepository) {}

  async getTvlHistoryData(
    options: HistoryOptionsDto,
  ): Promise<TvlHistoryDto[]> {
    const entities = await this.tvlHistoryRepository.find({});

    if (options.period === 'days') {
      return entities.map((entity) => entity.toDto());
    } else if (options.period === 'weeks' || options.period === 'months') {
      return this.getAverageTvlHistory(options, entities);
    }

    throw new BadRequestException('Unknown period');
  }

  protected async getAverageTvlHistory(
    options: HistoryOptionsDto,
    entities: TvlHistoryDto[],
  ): Promise<TvlHistoryDto[]> {
    const averageItems: TvlHistoryDto[] = [];

    const groups = groupBy(entities, ({ date }) =>
      UtilsService.getKeyByPeriod(date, options.period),
    );

    for (const key of Object.keys(groups)) {
      const groupData: TvlHistoryDto = groups[key][0];

      for (let i = 1; i < groups[key].length; i++) {
        const current = groups[key][i];
        groupData.farmingTvl = groupData.farmingTvl + current.farmingTvl;
        groupData.stakingTvl = groupData.stakingTvl + current.stakingTvl;
        groupData.strategiesTvlData = groupData.strategiesTvlData.map(
          (data) => {
            const curData = current.strategiesTvlData.find(
              (value) => data.strategyId === value.strategyId,
            );

            return {
              ...data,
              totalStrategyTvl:
                data.totalStrategyTvl + (curData?.totalStrategyTvl || 0),
            };
          },
        );
      }

      averageItems.push(groupData);
    }

    return averageItems;
  }
}
