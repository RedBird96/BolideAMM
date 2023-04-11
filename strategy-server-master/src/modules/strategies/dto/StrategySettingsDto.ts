import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, ValidateNested } from 'class-validator';

import { StrategyStorageReserveDto } from './StrategyStorageReserveDto';

export class StrategySettingsDto {
  @IsBoolean()
  @ApiProperty()
  isStrategyChangeNotify: boolean;

  @IsBoolean()
  @ApiProperty()
  isTransactionProdMode: boolean;

  @IsBoolean()
  @ApiProperty()
  isSaveTvlHistoryEnabled: boolean;

  @IsBoolean()
  @ApiProperty()
  isSaveApyHistoryEnabled: boolean;

  @ValidateNested({ each: true })
  @IsArray()
  @Type(() => StrategyStorageReserveDto)
  @ApiProperty({ isArray: true, type: StrategyStorageReserveDto })
  limitsToPreserveOnStorage: StrategyStorageReserveDto[];

  @IsNumber()
  @ApiProperty()
  maxAmountUsdToPreserveOnStorage: number;
}
