import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
import type { TypeHelpOptions } from 'class-transformer';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { PLATFORMS } from '../../../common/constants/platforms';
import { CONTRACT_TYPES } from '../constants/contract-types';
import { ContractDataDto } from './ContractDataDto';
import { InnerTokenDto } from './InnerTokenDataDto';
import { LpTokenDataDto } from './LpTokenDataDto';
import { StrStorageDataDto } from './StrStorageDataDto';

export const getContractDataType = (typeHelpOptions: TypeHelpOptions) => {
  const data = typeHelpOptions.object.data;

  if (!data) {
    return ContractDataDto;
  }

  if (data.baseContractId || data.baseContractAddress) {
    return InnerTokenDto;
  }

  if (Array.isArray(data.approvedTokens)) {
    return StrStorageDataDto;
  }

  if (data.fromTokenId && data.toTokenId) {
    return LpTokenDataDto;
  }

  return ContractDataDto;
};

export class ContractCreateDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  blockchainId: number;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  type: CONTRACT_TYPES;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  name: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  address: string;

  @IsOptional()
  @ApiPropertyOptional()
  platform?: PLATFORMS;

  @ApiPropertyOptional({
    oneOf: [
      { $ref: getSchemaPath(InnerTokenDto) },
      { $ref: getSchemaPath(LpTokenDataDto) },
      { $ref: getSchemaPath(StrStorageDataDto) },
    ],
  })
  @Type(getContractDataType)
  @ValidateNested()
  data?: ContractDataDto;
}
