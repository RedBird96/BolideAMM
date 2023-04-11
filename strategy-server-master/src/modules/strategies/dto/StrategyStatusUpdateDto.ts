import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class StrategyStatusUpdateDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}
