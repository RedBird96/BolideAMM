import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GasUsedDto {
  @ApiProperty()
  @IsString()
  ethers: string;

  @ApiProperty()
  @IsString()
  usd: string;
}
