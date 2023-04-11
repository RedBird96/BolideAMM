import { ApiProperty } from '@nestjs/swagger';
import { AbstractDto } from 'src/common/dto/AbstractDto';
import { PairDto } from 'src/modules/pairs/dto/PairDto';

import type { StrategyPairEntity } from '../strategy-pair.entity';

export class StrategyPairDto extends AbstractDto {
  @ApiProperty()
  strategyId: number;

  @ApiProperty()
  pairId: number;

  @ApiProperty()
  percentage: number;

  @ApiProperty()
  pair: PairDto;

  constructor(data: StrategyPairEntity, pair: PairDto) {
    super(data);
    this.strategyId = data.strategyId;
    this.pairId = data.pairId;
    this.percentage = data.percentage;
    this.pair = pair;
  }
}
