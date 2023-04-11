import { ApiProperty } from '@nestjs/swagger';
import { StrategyDto } from 'src/modules/strategies/dto/StrategyDto';

import type { ApysAnalyticsItem } from '../bnb-analytics.service';

export class GetApysAnaliticsDataDto {
  @ApiProperty()
  strategy: StrategyDto;

  @ApiProperty({ isArray: true })
  apys: ApysAnalyticsItem[];
}
