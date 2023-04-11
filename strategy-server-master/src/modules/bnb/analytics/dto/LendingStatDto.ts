import { ApiProperty } from '@nestjs/swagger';
import { PLATFORMS } from 'src/common/constants/platforms';
import { AbstractDto } from 'src/common/dto/AbstractDto';

import type { LendingStatEntity } from '../lending-stat.entity';

export class LendingStatDto extends AbstractDto {
  @ApiProperty()
  platform: PLATFORMS;

  @ApiProperty()
  totalBorrows: string;

  @ApiProperty()
  totalBorrowsUsd: string;

  @ApiProperty()
  totalSupply: string;

  @ApiProperty()
  totalSupplyUsd: string;

  @ApiProperty()
  collateralFactor: string;

  @ApiProperty()
  borrowApy: string;

  @ApiProperty()
  supplyApy: string;

  @ApiProperty()
  borrowVenusApy: string;

  @ApiProperty()
  supplyVenusApy: string;

  @ApiProperty()
  liquidity: string;

  @ApiProperty()
  tokenPrice: string;

  @ApiProperty()
  borrowerCount: number;

  @ApiProperty()
  supplierCount: number;

  @ApiProperty()
  platformAddress: string;

  @ApiProperty()
  platformSymbol: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  token: string;

  constructor(data: LendingStatEntity) {
    super(data);

    this.platform = data.platform;
    this.totalBorrows = data.totalBorrows;
    this.totalBorrowsUsd = data.totalBorrowsUsd;
    this.totalSupply = data.totalSupply;
    this.totalSupplyUsd = data.totalSupplyUsd;
    this.collateralFactor = data.collateralFactor;
    this.borrowApy = data.borrowApy;
    this.supplyApy = data.supplyApy;
    this.borrowVenusApy = data.borrowVenusApy;
    this.supplyVenusApy = data.supplyVenusApy;
    this.liquidity = data.liquidity;
    this.tokenPrice = data.tokenPrice;
    this.borrowerCount = data.borrowerCount;
    this.supplierCount = data.supplierCount;
    this.platformAddress = data.platformAddress;
    this.platformSymbol = data.platformSymbol;
    this.address = data.address;
    this.token = data.token;
  }
}
