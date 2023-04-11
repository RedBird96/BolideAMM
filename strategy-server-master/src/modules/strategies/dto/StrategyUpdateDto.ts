import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class StrategyUpdateDto {
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @ApiPropertyOptional()
  logicContractId?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @ApiPropertyOptional()
  storageContractId?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @ApiPropertyOptional()
  operationsPrivateKeyId?: number;

  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  @ApiPropertyOptional()
  boostingPrivateKeyId?: number;
}
