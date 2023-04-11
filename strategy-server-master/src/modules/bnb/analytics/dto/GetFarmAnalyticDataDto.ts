import { ApiProperty } from '@nestjs/swagger';

import type { FarmAnalyticItem } from '../bnb-analytics.service';

export class GetFarmAnalyticDataDto {
  @ApiProperty({ isArray: true })
  pancake: FarmAnalyticItem[];

  @ApiProperty()
  apeswap: FarmAnalyticItem[];
}
