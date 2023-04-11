import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsNumber } from 'class-validator';

import { ContractDataDto } from './ContractDataDto';

export class LpTokenDataDto extends ContractDataDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  @Expose()
  fromTokenId: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  @Expose()
  toTokenId: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  @Expose()
  pid: number;

  @IsNotEmpty()
  @IsBoolean()
  @ApiProperty()
  @Expose()
  isBorrowable: boolean;
}
