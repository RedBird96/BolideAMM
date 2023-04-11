import { ApiProperty } from '@nestjs/swagger';
import { AbstractDto } from 'src/common/dto/AbstractDto';

import type { MonitoringPairEntity } from '../monitoring/monitoring-pair.entity';

export class MonitoringPairDto extends AbstractDto {
  @ApiProperty()
  pairId: number;

  @ApiProperty()
  token1Price: string;

  @ApiProperty()
  token2Price: string;

  @ApiProperty()
  ratio: string;

  @ApiProperty()
  oldRatio: string;

  constructor(data: MonitoringPairEntity) {
    super(data);

    this.pairId = data.pairId;
    this.token1Price = data.token1Price;
    this.token2Price = data.token2Price;
    this.ratio = data.ratio;
    this.oldRatio = data.oldRatio;
  }
}
