import { Type } from 'class-transformer';
import { AbstractEntity } from 'src/common/abstract.entity';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { PLATFORMS } from '../../common/constants/platforms';
import { BlockchainEntity } from '../blockchains/blockchain.entity';
import { CONTRACT_TYPES } from './constants/contract-types';
import { ContractDataDto } from './dto/ContractDataDto';
import { ContractDto } from './dto/ContractDto';
import { InnerTokenDto } from './dto/InnerTokenDataDto';
import { LpTokenDataDto } from './dto/LpTokenDataDto';
import { StrStorageDataDto } from './dto/StrStorageDataDto';

@Entity({ name: 'contracts', orderBy: { id: 'ASC' } })
@Unique(['name', 'platform', 'blockchain'])
export class ContractEntity extends AbstractEntity<ContractDto> {
  @ManyToOne(() => BlockchainEntity)
  @JoinColumn({ name: 'blockchain_id' })
  blockchain: BlockchainEntity;

  @Column({ name: 'blockchain_id' })
  blockchainId: number;

  @Column({
    type: 'enum',
    enum: PLATFORMS,
    enumName: 'platform_enum',
    nullable: true,
  })
  platform?: PLATFORMS;

  @Column({ type: 'enum', enum: CONTRACT_TYPES })
  type: CONTRACT_TYPES;

  @Column()
  name: string;

  @Column({ unique: true })
  address: string;

  @Column({ type: 'jsonb', nullable: true })
  @Type(() => ContractDataDto, {
    discriminator: {
      property: 'type',
      subTypes: [
        {
          value: InnerTokenDto,
          name: CONTRACT_TYPES.INNER_TOKEN,
        },
        {
          value: LpTokenDataDto,
          name: CONTRACT_TYPES.LP_TOKEN,
        },
        {
          value: StrStorageDataDto,
          name: CONTRACT_TYPES.STR_STORAGE,
        },
      ],
    },
  })
  data?: ContractDataDto;

  dtoClass = ContractDto;
}
