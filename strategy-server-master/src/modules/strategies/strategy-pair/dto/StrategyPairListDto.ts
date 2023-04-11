import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';

import { StrategyPairDto } from './StrategyPairDto';

export class StrategyPairListDto {
  @ApiProperty({
    type: StrategyPairDto,
    isArray: true,
  })
  readonly items: StrategyPairDto[];

  @ApiProperty()
  readonly meta: PageMetaDto;

  constructor(items: StrategyPairDto[], meta: PageMetaDto) {
    this.items = items;
    this.meta = meta;
  }
}
