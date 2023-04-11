import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { AbstractDto } from 'src/common/dto/AbstractDto';

import { PLATFORMS } from '../../../common/constants/platforms';
import { CONTRACT_TYPES } from '../constants/contract-types';
import type { ContractEntity } from '../contract.entity';
import { ContractDataDto } from './ContractDataDto';
import { InnerTokenDto } from './InnerTokenDataDto';
import { LpTokenDataDto } from './LpTokenDataDto';
import { StrStorageDataDto } from './StrStorageDataDto';

export class ContractDto extends AbstractDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  blockchainId: number;

  @IsEnum(PLATFORMS)
  @ApiPropertyOptional({ enum: PLATFORMS })
  @IsOptional()
  platform?: PLATFORMS;

  @IsEnum(CONTRACT_TYPES)
  @ApiProperty({ enum: CONTRACT_TYPES })
  type: CONTRACT_TYPES;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  name: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  address: string;

  @ApiPropertyOptional({
    oneOf: [
      { $ref: getSchemaPath(InnerTokenDto) },
      { $ref: getSchemaPath(LpTokenDataDto) },
      { $ref: getSchemaPath(StrStorageDataDto) },
    ],
  })
  @ValidateNested()
  data?: ContractDataDto;

  constructor(data: ContractEntity) {
    super(data);

    this.blockchainId = data.blockchainId;
    this.platform = data.platform;
    this.type = data.type;
    this.name = data.name;
    this.address = data.address;
    this.data = data.data;
  }
}
