import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { PLATFORMS } from 'src/common/constants/platforms';

export class SwapPathCreateDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @ApiProperty()
  blockchainId: number;

  @IsEnum(PLATFORMS)
  @ApiProperty({ enum: PLATFORMS })
  platform: PLATFORMS;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @ApiProperty()
  fromTokenId: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @ApiProperty()
  toTokenId: number;

  @IsNotEmpty()
  @IsArray()
  @Type(() => Number)
  @ApiProperty({ isArray: true, type: Number })
  innerPath: number[];
}
