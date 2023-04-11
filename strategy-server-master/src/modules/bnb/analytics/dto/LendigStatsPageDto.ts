import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';

import { LendingStatDto } from './LendingStatDto';

export class LendingStatsPageDto {
  @ApiProperty({
    type: LendingStatDto,
    isArray: true,
  })
  readonly items: LendingStatDto[];

  @ApiProperty()
  readonly meta: PageMetaDto;

  constructor(items: LendingStatDto[], meta: PageMetaDto) {
    this.items = items;
    this.meta = meta;
  }
}
