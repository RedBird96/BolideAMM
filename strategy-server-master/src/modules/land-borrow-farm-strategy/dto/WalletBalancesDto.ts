import { ApiProperty } from '@nestjs/swagger';

export class WalletBalancesDto {
  @ApiProperty()
  bnbBalance: string;

  @ApiProperty()
  blidBalance: string;
}
