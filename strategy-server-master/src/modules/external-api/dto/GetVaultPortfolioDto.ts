import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsObject, IsString } from 'class-validator';

export class GetVaultPortfolioDto {
  @ApiProperty()
  @IsNumber()
  strategyId: number;

  @ApiProperty()
  @IsString()
  venusPercentLimit: string;

  @ApiProperty()
  @IsObject()
  walletInfo: Record<string, string>;

  @ApiProperty()
  @IsObject()
  farmingEarns: Record<string, string>;

  @ApiProperty()
  @IsObject()
  lendedTokens: Record<string, string>;

  @ApiProperty()
  @IsObject()
  borrowed: Record<string, string>;

  @ApiProperty()
  @IsObject()
  staked: Record<string, string>;

  @ApiProperty()
  @IsObject()
  stakedPortfolio: Record<string, any>;

  @ApiProperty()
  @IsString()
  lendedTotal: string;

  @ApiProperty()
  @IsString()
  logicContractAddress: string;
}
