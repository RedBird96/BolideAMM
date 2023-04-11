import type { DeleteResult } from 'typeorm';
import { Repository } from 'typeorm';
import { EntityRepository } from 'typeorm/decorator/EntityRepository';

import { MonitoringPairEntity } from './monitoring-pair.entity';

@EntityRepository(MonitoringPairEntity)
export class MonitoringPairRepository extends Repository<MonitoringPairEntity> {
  async findActual(limit: number): Promise<MonitoringPairEntity[]> {
    return this.find({ take: limit, order: { id: 'DESC' } });
  }

  async removeOldData(createdAtFrom: string): Promise<DeleteResult> {
    const queryBuilder = this.createQueryBuilder();

    return queryBuilder
      .delete()
      .where(`createdAt < '${createdAtFrom}'`)
      .execute();
  }
}
