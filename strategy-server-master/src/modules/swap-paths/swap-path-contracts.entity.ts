import { AbstractEntity } from 'src/common/abstract.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { ContractEntity } from '../contracts/contract.entity';
import { SwapPathEntity } from './swap-path.entity';

@Entity({ name: 'swap_paths_contracts' })
@Unique(['swapPathId', 'contractId'])
export class SwapPathContractsEntity extends AbstractEntity {
  @Column({ name: 'swap_path_id' })
  @Index()
  public swapPathId!: number;

  @Column({ name: 'contracts_id' })
  @Index()
  public contractId!: number;

  @ManyToOne(() => SwapPathEntity, (swapPath) => swapPath.innerPath)
  @JoinColumn({ name: 'swap_path_id' })
  public swapPath!: SwapPathEntity;

  @ManyToOne(() => ContractEntity)
  @JoinColumn({ name: 'contracts_id' })
  public contract!: ContractEntity;

  dtoClass = null;
}
