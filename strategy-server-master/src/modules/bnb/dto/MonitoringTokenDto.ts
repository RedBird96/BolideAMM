import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AbstractDto } from 'src/common/dto/AbstractDto';
import { Column } from 'typeorm';

import type { MonitoringTokenEntity } from '../monitoring/monitoring-token.entity';

export class MonitoringTokenDto extends AbstractDto {
  @ApiProperty()
  market: string;

  @ApiProperty()
  token: string;

  @Column()
  price: string;

  @ApiPropertyOptional()
  dexPrice?: string;

  constructor(data: MonitoringTokenEntity) {
    super(data);

    this.market = data.market;
    this.token = data.token;
    this.price = data.price;
    this.dexPrice = data.dexPrice;
  }
}
