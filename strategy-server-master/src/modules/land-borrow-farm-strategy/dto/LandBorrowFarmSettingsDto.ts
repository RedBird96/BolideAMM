import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString } from 'class-validator';
import { StrategySettingsDto } from 'src/modules/strategies/dto/StrategySettingsDto';

export class LandBorrowFarmSettingsDto extends StrategySettingsDto {
  @IsNumber()
  @ApiProperty()
  adminMinBnbBalance: number;

  @IsBoolean()
  @ApiProperty()
  isAdminBalanceCronEnabled: boolean;

  @IsNumber()
  @ApiProperty()
  adminBalanceCheckTimeoutMilliseconds: number;

  @IsBoolean()
  @ApiProperty()
  isAnalyticsCronEnabled: boolean;

  @IsBoolean()
  @ApiProperty()
  isBoostingBalanceCheckCronEnabled: boolean;

  @IsNumber()
  @ApiProperty()
  boostingBalanceCheckTimeoutMilliseconds: number;

  @IsNumber()
  @ApiProperty()
  boostingWalletMinBlidBalanceUsd: number;

  @IsNumber()
  @ApiProperty()
  analyticsTimeoutMilliseconds: number;

  @IsBoolean()
  @ApiProperty()
  isBnbBorrowLimitCronEnabled: boolean;

  @IsBoolean()
  @ApiProperty()
  isAutostartEnabled: boolean;

  @IsBoolean()
  @ApiProperty()
  isClaimAutostartEnabled: boolean;

  @IsNumber()
  @ApiProperty()
  timeoutMilliseconds: number;

  @IsNumber()
  @ApiProperty()
  claimTimeoutMilliseconds: number;

  @IsNumber()
  @ApiProperty()
  quantityTokensInBlock: number;

  @IsNumber()
  @ApiProperty()
  borrowLimitPercentage: number;

  @IsNumber()
  @ApiProperty()
  borrowLimitPercentageMin: number;

  @IsNumber()
  @ApiProperty()
  borrowLimitPercentageMax: number;

  @IsNumber()
  @ApiProperty()
  claimMinUsd: number;

  @IsNumber()
  @ApiProperty()
  maxBlidRewardsDestribution: number;

  @IsNumber()
  @ApiProperty()
  farmCheckSumInUsd: number;

  @IsNumber()
  @ApiProperty()
  farmMaxDiffPercent: number;

  @IsNumber()
  @ApiProperty()
  minTakeTokenFromStorageEther: number;

  @IsString()
  @ApiProperty()
  theGraphApiUrl: string;

  @IsBoolean()
  @ApiProperty()
  isClaimVenus: boolean;

  @IsBoolean()
  @ApiProperty()
  isClaimFarms: boolean;

  @IsBoolean()
  @ApiProperty()
  isClaimLended: boolean;

  @IsBoolean()
  @ApiProperty()
  isVenusClaimAutostartEnabled: boolean;

  @IsNumber()
  @ApiProperty()
  venusClaimTimeoutMilliseconds: number;

  @IsBoolean()
  @ApiProperty()
  isFailedDistributeNotification: boolean;

  @IsBoolean()
  @ApiProperty()
  isDistributeIfNegativeBalance: boolean;
}
