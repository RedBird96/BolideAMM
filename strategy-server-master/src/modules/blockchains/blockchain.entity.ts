import { Type } from 'class-transformer';
import { AbstractEntity } from 'src/common/abstract.entity';
import { BLOCKCHAIN_NAMES } from 'src/common/constants/blockchain-names';
import { Column, Entity } from 'typeorm';

import { BnbSettingsDto } from '../bnb/dto/BnbSettingsDto';
import { BlockchainDto } from './dto/BlockchainDto';
import { BlockchainSettingsDto } from './dto/BlockchainSettingsDto';

@Entity({ name: 'blockchains' })
export class BlockchainEntity extends AbstractEntity<BlockchainDto> {
  @Column({ unique: true, enum: BLOCKCHAIN_NAMES })
  name: BLOCKCHAIN_NAMES;

  @Column({ type: 'jsonb' })
  @Type(() => BlockchainSettingsDto, {
    discriminator: {
      property: 'name',
      subTypes: [
        {
          value: BnbSettingsDto,
          name: BLOCKCHAIN_NAMES.BNB,
        },
      ],
    },
  })
  settings: BlockchainSettingsDto;

  dtoClass = BlockchainDto;
}
