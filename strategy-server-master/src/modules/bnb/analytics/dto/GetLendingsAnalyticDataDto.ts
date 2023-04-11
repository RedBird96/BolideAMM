import { ApiProperty } from '@nestjs/swagger';

import type { VenusTokenInfo } from '../../venus/venus-token-info.interface';

export class GetLendingsAnalyticDataDto {
  @ApiProperty({ isArray: true })
  venus: VenusTokenInfo[];
}
