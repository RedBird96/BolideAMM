import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class HistoryOptionsDto {
  @ApiProperty()
  @IsString()
  period: 'days' | 'weeks' | 'months';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractAddress?: string;
}
