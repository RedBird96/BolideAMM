import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { PLATFORMS } from 'src/common/constants/platforms';

export class CreatePairOptionsDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @ApiProperty()
  blockchainId: number;

  @IsNotEmpty()
  @IsEnum(PLATFORMS)
  @ApiProperty({ enum: PLATFORMS })
  platform: PLATFORMS;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  address: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  fromTokenName: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  toTokenName: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @ApiProperty()
  pid: number;
}
