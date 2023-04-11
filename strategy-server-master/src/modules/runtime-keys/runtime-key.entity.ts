import { AbstractEntity } from 'src/common/abstract.entity';
import { Column, Entity } from 'typeorm';

import { RuntimeKeyDto } from './dto/RuntimeKeyDto';

@Entity({ name: 'runtime_keys' })
export class RuntimeKeyEntity extends AbstractEntity<RuntimeKeyDto> {
  @Column({ unique: true, nullable: false })
  name: string;

  @Column({ nullable: true })
  description: string;

  dtoClass = RuntimeKeyDto;
}
