import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';

import { ApyStatDto } from './ApyStatDto';

export class ApyStatsPageDto {
  @ApiProperty({
    type: ApyStatDto,
    isArray: true,
  })
  readonly items: ApyStatDto[];

  @ApiProperty()
  readonly meta: PageMetaDto;

  constructor(items: ApyStatDto[], meta: PageMetaDto) {
    this.items = items;
    this.meta = meta;
  }
}
