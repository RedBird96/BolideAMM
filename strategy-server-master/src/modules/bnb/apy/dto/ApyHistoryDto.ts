import { ApiProperty } from '@nestjs/swagger';
import { AbstractDto } from 'src/common/dto/AbstractDto';

import type { ApyHistoryEntity } from '../apy-history.entity';
import type { ApyHistoryStrategyDataDto } from './ApyHistoryStrategyDataDto';

export class ApyHistoryDto extends AbstractDto {
  @ApiProperty()
  date: Date;

  @ApiProperty()
  farmingApy: number;

  @ApiProperty()
  stakingApy: number;

  @ApiProperty()
  strategiesApyData: ApyHistoryStrategyDataDto[];

  constructor(data: ApyHistoryEntity) {
    super(data);

    this.date = data.date;
    this.farmingApy = data.farmingApy;
    this.stakingApy = data.stakingApy;
    this.strategiesApyData = data.strategiesApyData;
  }
}
