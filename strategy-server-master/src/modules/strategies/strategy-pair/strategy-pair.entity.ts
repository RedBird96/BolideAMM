import { AbstractEntity } from 'src/common/abstract.entity';
import { ContractEntity } from 'src/modules/contracts/contract.entity';
import { Column, Entity, Index, ManyToOne } from 'typeorm';

import { StrategyEntity } from '../strategy.entity';
import { StrategyPairDto } from './dto/StrategyPairDto';
import { ColumnNumericTransformer } from './utils';

@Index('uid_strategy_pa_strateg_fcec56', ['pairId', 'strategyId'], {
  unique: true,
})
@Entity({ name: 'strategy_pairs' })
export class StrategyPairEntity extends AbstractEntity<StrategyPairDto> {
  @Column()
  public pairId: number;

  @Column()
  public strategyId: number;

  @Column('numeric', {
    precision: 10,
    scale: 8,
    transformer: new ColumnNumericTransformer(),
  })
  public percentage: number;

  @ManyToOne(() => ContractEntity)
  public pair!: ContractEntity;

  @ManyToOne(() => StrategyEntity, (strategy) => strategy.strategyPair)
  public strategy!: StrategyEntity;

  dtoClass = StrategyPairDto;
}
