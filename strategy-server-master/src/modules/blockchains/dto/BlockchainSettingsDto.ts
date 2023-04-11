import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class BlockchainSettingsDto {
  @IsBoolean()
  @ApiProperty()
  isSaveFarmingHistoryEnabled: boolean;

  @IsBoolean()
  @ApiProperty()
  isSaveStakingHistoryEnabled: boolean;
}
