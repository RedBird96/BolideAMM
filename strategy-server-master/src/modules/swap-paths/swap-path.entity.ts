import { AbstractEntity } from 'src/common/abstract.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';

import { PLATFORMS } from '../../common/constants/platforms';
import { BlockchainEntity } from '../blockchains/blockchain.entity';
import { ContractEntity } from '../contracts/contract.entity';
import { SwapPathDto } from './dto/SwapPathDto';
import { SwapPathContractsEntity } from './swap-path-contracts.entity';

@Entity({ name: 'swap_paths' })
@Unique(['blockchain', 'platform', 'fromToken', 'toToken'])
export class SwapPathEntity extends AbstractEntity<SwapPathDto> {
  @ManyToOne(() => BlockchainEntity, { nullable: false })
  @JoinColumn()
  blockchain: BlockchainEntity;

  @Column({ name: 'blockchain_id' })
  blockchainId: number;

  @Column({ type: 'enum', enum: PLATFORMS, enumName: 'platform_enum' })
  platform: PLATFORMS;

  @ManyToOne(() => ContractEntity, { nullable: false })
  @JoinColumn()
  fromToken: ContractEntity;

  @Column({ name: 'from_token_id' })
  fromTokenId: number;

  @ManyToOne(() => ContractEntity, { nullable: false })
  @JoinColumn()
  toToken: ContractEntity;

  @Column({ name: 'to_token_id' })
  toTokenId: number;

  @OneToMany(
    () => SwapPathContractsEntity,
    (swapPathContracts) => swapPathContracts.contract,
  )
  innerPath: SwapPathContractsEntity[];

  dtoClass = SwapPathDto;
}
