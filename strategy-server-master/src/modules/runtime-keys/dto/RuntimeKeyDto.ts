import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { AbstractDto } from 'src/common/dto/AbstractDto';

import type { RuntimeKeyEntity } from '../runtime-key.entity';

export class RuntimeKeyDto extends AbstractDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  name: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional()
  description: string;

  constructor(data: RuntimeKeyEntity) {
    super(data);

    this.name = data.name;
    this.description = data.description;
  }
}
