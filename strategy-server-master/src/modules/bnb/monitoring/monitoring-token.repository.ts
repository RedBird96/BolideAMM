import type { DeleteResult } from 'typeorm';
import { Repository } from 'typeorm';
import { EntityRepository } from 'typeorm/decorator/EntityRepository';

import { MonitoringTokenEntity } from './monitoring-token.entity';

@EntityRepository(MonitoringTokenEntity)
export class MonitoringTokenRepository extends Repository<MonitoringTokenEntity> {
  async removeOldData(createdAtFrom: string): Promise<DeleteResult> {
    const queryBuilder = this.createQueryBuilder();

    return queryBuilder
      .delete()
      .where(`createdAt < '${createdAtFrom}'`)
      .execute();
  }
}
