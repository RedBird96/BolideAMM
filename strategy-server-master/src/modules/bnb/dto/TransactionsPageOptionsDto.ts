import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional } from 'class-validator';
import { PageOptionsDto } from 'src/common/dto/PageOptionsDto';

export class TransactionsPageOptionsDto extends PageOptionsDto {
  @IsArray()
  @Type(() => String)
  @IsOptional()
  @ApiPropertyOptional({
    isArray: true,
    type: String,
  })
  readonly operationsIds: string[];
}
