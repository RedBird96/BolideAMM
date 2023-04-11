import { Repository } from 'typeorm';
import { EntityRepository } from 'typeorm/decorator/EntityRepository';

import { TvlHistoryEntity } from './tvl-history.entity';

@EntityRepository(TvlHistoryEntity)
export class TvlHistoryRepository extends Repository<TvlHistoryEntity> {}
