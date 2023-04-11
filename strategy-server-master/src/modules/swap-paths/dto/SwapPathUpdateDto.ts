import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray } from 'class-validator';

export class SwapPathUpdateDto {
  @IsArray()
  @Type(() => Number)
  @ApiProperty({
    isArray: true,
    type: Number,
    description: 'Путь обмена, исключая концевые/обменные токены',
  })
  innerPath: number[];
}
