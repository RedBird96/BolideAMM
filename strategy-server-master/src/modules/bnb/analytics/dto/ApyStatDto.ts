import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PLATFORMS } from 'src/common/constants/platforms';
import { AbstractDto } from 'src/common/dto/AbstractDto';

import type { ApyStatEntity } from '../apy-stat.entity';

export class ApyStatDto extends AbstractDto {
  @ApiPropertyOptional()
  strategyId: number;

  @ApiProperty()
  lendingPlatform: PLATFORMS;

  @ApiProperty()
  farmPlatform: PLATFORMS;

  @ApiProperty()
  farmApy: string;

  @ApiProperty()
  suppliedTokensApy: string;

  @ApiProperty()
  borrowTokensApy: string;

  @ApiProperty()
  totalApy: string;

  @ApiProperty()
  pair: string;

  constructor(data: ApyStatEntity) {
    super(data);

    this.strategyId = data.strategyId;
    this.lendingPlatform = data.lendingPlatform;
    this.farmPlatform = data.farmPlatform;
    this.farmApy = data.farmApy;
    this.suppliedTokensApy = data.suppliedTokensApy;
    this.borrowTokensApy = data.borrowTokensApy;
    this.totalApy = data.totalApy;
    this.pair = data.pair;
  }
}
