import { Type } from 'class-transformer';
import { AbstractEntity } from 'src/common/abstract.entity';
import { STRATEGY_TYPES } from 'src/common/constants/strategy-types';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';

import { BlockchainEntity } from '../blockchains/blockchain.entity';
import { ContractEntity } from '../contracts/contract.entity';
import { LandBorrowFarmSettingsDto } from '../land-borrow-farm-strategy/dto/LandBorrowFarmSettingsDto';
import { LandBorrowSettingsDto } from '../land-borrow-strategy/dto/LandBorrowSettingsDto';
import { RuntimeKeyEntity } from '../runtime-keys/runtime-key.entity';
import { StrategyDto } from './dto/StrategyDto';
import { StrategySettingsDto } from './dto/StrategySettingsDto';
import { StrategyPairEntity } from './strategy-pair/strategy-pair.entity';

@Entity({ name: 'strategies' })
export class StrategyEntity extends AbstractEntity<StrategyDto> {
  @Column({ nullable: false, unique: true })
  name: string;

  @Column({ type: 'enum', enum: STRATEGY_TYPES })
  type: STRATEGY_TYPES;

  @Column({ nullable: false })
  blockchainId: number;

  @ManyToOne(() => BlockchainEntity)
  @JoinColumn({ name: 'blockchain_id' })
  blockchain: BlockchainEntity;

  @Column({ name: 'logic_contract_id', nullable: false, unique: true })
  logicContractId: number;

  @OneToOne(() => ContractEntity)
  @JoinColumn()
  logicContract: ContractEntity;

  @Column({ name: 'storage_contract_id', nullable: false })
  storageContractId: number;

  @ManyToOne(() => ContractEntity)
  @JoinColumn()
  storageContract: ContractEntity;

  @Column({ nullable: true })
  isActive: boolean;

  @OneToMany(() => StrategyPairEntity, (strategyPair) => strategyPair.strategy)
  public strategyPair!: StrategyPairEntity[];

  @Column({ name: 'operations_private_key_id', nullable: true })
  operationsPrivateKeyId: number | null;

  @OneToOne(() => RuntimeKeyEntity, { nullable: true })
  @JoinColumn()
  operationsPrivateKey: RuntimeKeyEntity | undefined;

  @Column({ name: 'boosting_private_key_id', nullable: true })
  boostingPrivateKeyId: number | null;

  @ManyToOne(() => RuntimeKeyEntity, { nullable: true })
  @JoinColumn()
  boostingPrivateKey: RuntimeKeyEntity | undefined;

  @Column({ type: 'jsonb' })
  @Type(() => StrategySettingsDto, {
    discriminator: {
      property: 'type',
      subTypes: [
        {
          value: LandBorrowFarmSettingsDto,
          name: STRATEGY_TYPES.LAND_BORROW_FARM,
        },
        {
          value: LandBorrowSettingsDto,
          name: STRATEGY_TYPES.LAND_BORROW,
        },
      ],
    },
  })
  settings: StrategySettingsDto;

  dtoClass = StrategyDto;
}
