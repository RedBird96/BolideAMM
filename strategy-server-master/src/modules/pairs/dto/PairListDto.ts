import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';

import { PairDto } from './PairDto';

export class PairListDto {
  @ApiProperty({
    type: PairDto,
    isArray: true,
  })
  readonly items: PairDto[];

  @ApiProperty()
  readonly meta: PageMetaDto;

  constructor(items: PairDto[], meta: PageMetaDto) {
    this.items = items;
    this.meta = meta;
  }
}
