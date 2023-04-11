import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { AbstractDto } from 'src/common/dto/AbstractDto';
import { BnbSettingsDto } from 'src/modules/bnb/dto/BnbSettingsDto';

import { BlockchainEntity } from '../blockchain.entity';
import { BlockchainSettingsDto } from './BlockchainSettingsDto';

@ApiExtraModels(BnbSettingsDto)
export class BlockchainDto extends AbstractDto {
  @ApiProperty()
  name: string;

  @ApiProperty({
    oneOf: [{ $ref: getSchemaPath(BnbSettingsDto) }],
  })
  settings: BlockchainSettingsDto;

  constructor(data: BlockchainEntity) {
    super(data);

    this.name = data.name;
    this.settings = data.settings;
  }
}
