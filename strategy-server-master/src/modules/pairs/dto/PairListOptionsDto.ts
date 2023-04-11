import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { PLATFORMS } from 'src/common/constants/platforms';
import { PageOptionsDto } from 'src/common/dto/PageOptionsDto';

export class PairListOptionsDto extends PageOptionsDto {
  @ApiPropertyOptional()
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  readonly blockchainId?: number;

  @ApiPropertyOptional({ enum: PLATFORMS })
  @IsEnum(PLATFORMS)
  @IsOptional()
  readonly platform?: PLATFORMS;
}
