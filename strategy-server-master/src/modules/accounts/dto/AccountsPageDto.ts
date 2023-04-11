import { ApiProperty } from '@nestjs/swagger';
import { PageMetaDto } from 'src/common/dto/PageMetaDto';

import { AccountDto } from './AccountDto';

export class AccountsPageDto {
  @ApiProperty({
    type: AccountDto,
    isArray: true,
  })
  readonly items: AccountDto[];

  @ApiProperty()
  readonly meta: PageMetaDto;

  constructor(items: AccountDto[], meta: PageMetaDto) {
    this.items = items;
    this.meta = meta;
  }
}
