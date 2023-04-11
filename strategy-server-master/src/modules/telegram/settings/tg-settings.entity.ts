import { AbstractEntity } from 'src/common/abstract.entity';
import { Column, Entity } from 'typeorm';

import { TelegramSettingsDto } from './dto/TelegramSettingsDto';

export type AccountNegativeLimits = Record<string, string>;

@Entity({ name: 'settings' })
export class TelegramSettingsEntity extends AbstractEntity<TelegramSettingsDto> {
  @Column({ nullable: true, unique: true })
  targetGroupId: string;

  @Column({ nullable: true, unique: true })
  adminTelegramId: string;

  dtoClass = TelegramSettingsDto;
}
