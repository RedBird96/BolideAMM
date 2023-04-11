import { ApiProperty } from '@nestjs/swagger';

export class ApprovePairForSwapDto {
  @ApiProperty()
  pair: string;

  @ApiProperty()
  market: string;
}
