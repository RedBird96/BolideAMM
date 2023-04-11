import { Repository } from 'typeorm';
import { EntityRepository } from 'typeorm/decorator/EntityRepository';

import { TelegramSettingsEntity } from './tg-settings.entity';

@EntityRepository(TelegramSettingsEntity)
export class TelegramSettingsRepository extends Repository<TelegramSettingsEntity> {
  constructor() {
    super();
  }
}
