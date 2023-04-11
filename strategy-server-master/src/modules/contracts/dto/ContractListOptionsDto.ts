import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { PLATFORMS } from 'src/common/constants/platforms';

import { ToInt } from '../../../decorators/transforms.decorator';
import { CONTRACT_TYPES } from '../constants/contract-types';

export class ContractListOptionsDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsNotEmpty()
  @ToInt()
  readonly blockchainId?: number;

  @ApiPropertyOptional({ enum: PLATFORMS })
  @IsEnum(PLATFORMS)
  @IsOptional()
  readonly platform?: PLATFORMS;

  @ApiPropertyOptional({ enum: CONTRACT_TYPES })
  @IsEnum(CONTRACT_TYPES)
  @IsOptional()
  readonly type?: CONTRACT_TYPES;

  @ApiPropertyOptional()
  @IsOptional()
  readonly name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  readonly address?: string;
}
