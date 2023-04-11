import { ApiProperty } from '@nestjs/swagger';
import { AbstractDto } from 'src/common/dto/AbstractDto';

import type { FarmStatEntity } from '../farm-stat.entity';

export class FarmStatDto extends AbstractDto {
  @ApiProperty()
  token1: string;

  @ApiProperty()
  token2: string;

  @ApiProperty()
  market: string;

  @ApiProperty()
  pair: string;

  @ApiProperty()
  lpAddress: string;

  @ApiProperty()
  apr: string;

  @ApiProperty()
  poolLiquidityUsd: string;

  @ApiProperty()
  poolWeight: string;

  @ApiProperty()
  lpPrice: string;

  @ApiProperty()
  token1Liquidity: string;

  @ApiProperty()
  token1Price: string;

  @ApiProperty()
  token2Liquidity: string;

  @ApiProperty()
  token2Price: string;

  @ApiProperty()
  totalSupply: string;

  constructor(data: FarmStatEntity) {
    super(data);

    this.token1 = data.token1;
    this.token2 = data.token2;
    this.market = data.market;
    this.pair = data.pair;
    this.lpAddress = data.lpAddress;
    this.apr = data.apr;
    this.poolLiquidityUsd = data.poolLiquidityUsd;
    this.poolWeight = data.poolWeight;
    this.lpPrice = data.lpPrice;
    this.token1Liquidity = data.token1Liquidity;
    this.token1Price = data.token1Price;
    this.token2Liquidity = data.token2Liquidity;
    this.token2Price = data.token2Price;
    this.totalSupply = data.totalSupply;
  }
}
