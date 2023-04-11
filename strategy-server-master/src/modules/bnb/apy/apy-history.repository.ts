import { Repository } from 'typeorm';
import { EntityRepository } from 'typeorm/decorator/EntityRepository';

import { ApyHistoryEntity } from './apy-history.entity';

@EntityRepository(ApyHistoryEntity)
export class ApyHistoryRepository extends Repository<ApyHistoryEntity> {}
