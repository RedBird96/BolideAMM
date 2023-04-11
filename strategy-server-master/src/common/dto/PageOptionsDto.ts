import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

import { ORDER } from '../constants/order';

export class PageOptionsDto {
  @ApiPropertyOptional({
    enum: ORDER,
  })
  @IsEnum(ORDER)
  @IsOptional()
  readonly order: ORDER;

  @ApiPropertyOptional()
  @IsOptional()
  readonly orderField: string;

  @ApiPropertyOptional({
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly page: number = 1;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(100)
  @IsOptional()
  readonly take: number = 100;
}
