import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UtilsService } from '../providers/utils.service';
import type { AbstractUUIDDto } from './dto/AbstractUuidDto';

export abstract class AbstractUUIDEntity<
  T extends AbstractUUIDDto = AbstractUUIDDto,
> {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({
    type: 'timestamp without time zone',
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp without time zone',
    name: 'updated_at',
  })
  updatedAt: Date;

  abstract dtoClass: new (entity: AbstractUUIDEntity, options?: any) => T;

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  toDto(options?: any) {
    return UtilsService.toDto(this.dtoClass, this, options);
  }
}
