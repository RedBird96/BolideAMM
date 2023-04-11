import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { PLATFORMS } from 'src/common/constants/platforms';

import { PageOptionsDto } from '../../../common/dto/PageOptionsDto';

export class SwapPathListOptionsDto extends PageOptionsDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @ApiProperty()
  blockchainId: number;

  @IsEnum(PLATFORMS)
  @IsOptional()
  @ApiPropertyOptional({ enum: PLATFORMS })
  platform?: PLATFORMS;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional()
  fromTokenId?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional()
  toTokenId?: number;
}
