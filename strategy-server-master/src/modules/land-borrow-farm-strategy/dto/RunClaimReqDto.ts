import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { strToBool } from 'src/common/transform-fns/str-to-bool';

export class RunClaimReqDto {
  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  @Transform(strToBool)
  isRunForce: boolean;
}
