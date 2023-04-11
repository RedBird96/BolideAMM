import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';

import { LbfStatDto } from './LbfStatDto';

export class LbfStatsPageDto {
  @ApiProperty({
    type: LbfStatDto,
    isArray: true,
  })
  readonly items: LbfStatDto[];

  @ApiProperty()
  readonly meta: PageMetaDto;

  constructor(items: LbfStatDto[], meta: PageMetaDto) {
    this.items = items;
    this.meta = meta;
  }
}
