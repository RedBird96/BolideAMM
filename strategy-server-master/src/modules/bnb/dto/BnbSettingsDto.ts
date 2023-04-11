import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber } from 'class-validator';

import { BlockchainSettingsDto } from '../../blockchains/dto/BlockchainSettingsDto';

export class BnbSettingsDto extends BlockchainSettingsDto {
  @IsNumber()
  @ApiProperty()
  txConfirmationTimeoutMs: number;

  @IsNumber()
  @ApiProperty()
  txConfirmationBlocks: number;

  @IsBoolean()
  @ApiProperty()
  isAnalyticsStatCronEnabled: boolean;

  @IsNumber()
  @ApiProperty()
  analyticsStatCronTimeoutMilleseconds: number;

  @IsBoolean()
  @ApiProperty()
  isMonitoringPairsCronEnabled: boolean;

  @IsNumber()
  @ApiProperty()
  monitoringPairsCronTimeoutMilleseconds: number;

  @IsNumber()
  @ApiProperty()
  tokensRationChangePercentForReaction: number;

  @IsNumber()
  @ApiProperty()
  removePairsAfterDays: number;

  @IsBoolean()
  @ApiProperty()
  isNotifyIfLpPairAdded: boolean;

  @IsBoolean()
  @ApiProperty()
  isNotifyIfLpPairRemoved: boolean;

  @IsBoolean()
  @ApiProperty()
  isBnbBorrowCostCronEnabled: boolean;

  @IsNumber()
  @ApiProperty()
  web3BatchSizeLimit: number;
}
