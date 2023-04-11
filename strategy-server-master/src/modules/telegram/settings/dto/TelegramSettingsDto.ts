import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AbstractDto } from 'src/common/dto/AbstractDto';

import type { TelegramSettingsEntity } from '../tg-settings.entity';

export class TelegramSettingsDto extends AbstractDto {
  @ApiProperty()
  targetGroupId: string;

  @ApiPropertyOptional()
  adminTelegramId: string;

  constructor(data: TelegramSettingsEntity) {
    super(data);

    this.targetGroupId = data.targetGroupId;
    this.adminTelegramId = data.adminTelegramId;
  }
}
