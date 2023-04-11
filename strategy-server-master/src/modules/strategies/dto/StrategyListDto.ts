import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';

import { StrategyDto } from './StrategyDto';

export class StrategyListDto {
  @ApiProperty({
    type: StrategyDto,
    isArray: true,
  })
  readonly items: StrategyDto[];

  @ApiProperty()
  readonly meta: PageMetaDto;

  constructor(items: StrategyDto[], meta: PageMetaDto) {
    this.items = items;
    this.meta = meta;
  }
}
