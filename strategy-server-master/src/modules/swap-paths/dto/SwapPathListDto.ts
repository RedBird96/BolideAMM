import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';

import { SwapPathDto } from './SwapPathDto';

export class SwapPathListDto {
  @ApiProperty({
    type: SwapPathDto,
    isArray: true,
  })
  readonly items: SwapPathDto[];

  @ApiProperty()
  readonly meta: PageMetaDto;

  constructor(items: SwapPathDto[], meta: PageMetaDto) {
    this.items = items;
    this.meta = meta;
  }
}
