import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber } from 'class-validator';
import { StrategySettingsDto } from 'src/modules/strategies/dto/StrategySettingsDto';

export class LandBorrowSettingsDto extends StrategySettingsDto {
  @IsBoolean()
  @ApiProperty()
  isAutostartEnabled: boolean;

  @IsBoolean()
  @ApiProperty()
  isClaimAutostartEnabled: boolean;

  @IsNumber()
  @ApiProperty()
  autostartTimeoutMilliseconds: number;

  @IsNumber()
  @ApiProperty()
  claimTimeoutMilliseconds: number;
}
