import type { AbstractUUIDEntity } from '../abstract-uuid.entity';

export class AbstractUUIDDto {
  id: string;

  createdAt: Date;

  updatedAt: Date;

  constructor(entity: AbstractUUIDEntity) {
    this.id = entity.id;
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
  }
}
