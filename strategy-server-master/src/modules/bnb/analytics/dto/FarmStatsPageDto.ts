import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';

import { FarmStatDto } from './FarmStatDto';

export class FarmStatsPageDto {
  @ApiProperty({
    type: FarmStatDto,
    isArray: true,
  })
  readonly items: FarmStatDto[];

  @ApiProperty()
  readonly meta: PageMetaDto;

  constructor(items: FarmStatDto[], meta: PageMetaDto) {
    this.items = items;
    this.meta = meta;
  }
}
