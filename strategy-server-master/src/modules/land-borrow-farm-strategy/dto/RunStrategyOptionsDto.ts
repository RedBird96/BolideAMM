import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';
import { strToBool } from 'src/common/transform-fns/str-to-bool';

export class RunStrategyOptionsDto {
  @ApiProperty({ default: false })
  @IsBoolean()
  @Transform(strToBool)
  isNeedToRecreateAll: boolean;
}
