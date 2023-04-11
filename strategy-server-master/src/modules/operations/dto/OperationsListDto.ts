import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';

import { OperationDto } from './OperationDto';
import type { OperationsListItemDto } from './OperationsListItemDto';

export class OperationsListDto {
  @ApiProperty({
    type: OperationDto,
    isArray: true,
  })
  readonly items: OperationDto[];

  @ApiProperty()
  readonly meta: PageMetaDto;

  constructor(items: OperationsListItemDto[], meta: PageMetaDto) {
    this.items = items;
    this.meta = meta;
  }
}
