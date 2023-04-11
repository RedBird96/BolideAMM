import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

import { ContractDataDto } from './ContractDataDto';

export class InnerTokenDto extends ContractDataDto {
  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  @Expose()
  baseContractId: number;

  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  @Expose()
  baseContractAddress: string;
}
