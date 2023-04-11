import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsNumber } from 'class-validator';
import { PLATFORMS } from 'src/common/constants/platforms';
import { AbstractDto } from 'src/common/dto/AbstractDto';

import type { SwapPathEntity } from '../swap-path.entity';

export class SwapPathDto extends AbstractDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  blockchainId: number;

  @IsEnum({ type: PLATFORMS })
  @ApiProperty({ enum: PLATFORMS })
  platform: PLATFORMS;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  fromTokenId: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  toTokenId: number;

  @IsNotEmpty()
  @IsArray()
  @Type(() => Number)
  @ApiProperty({ isArray: true, type: Number })
  innerPath: number[];

  constructor(data: SwapPathEntity) {
    super(data);

    this.blockchainId = data.blockchainId;
    this.platform = data.platform;
    this.fromTokenId = data.fromTokenId;
    this.toTokenId = data.toTokenId;
    this.innerPath = data.innerPath.map((item) => item.contractId);
  }
}
