import type { AbstractEntity } from '../abstract.entity';

export class AbstractDto {
  id: number;

  createdAt: Date;

  updatedAt: Date;

  constructor(entity: AbstractEntity) {
    this.id = entity.id;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }
}
