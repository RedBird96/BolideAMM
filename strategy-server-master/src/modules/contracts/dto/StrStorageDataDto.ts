import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsArray } from 'class-validator';

import { ContractDataDto } from './ContractDataDto';

export class StrStorageDataDto extends ContractDataDto {
  @IsArray()
  @Type(() => String)
  @ApiProperty({ isArray: true, type: String })
  @Expose()
  approvedTokens: string[];
}
