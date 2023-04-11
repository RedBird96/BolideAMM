import { PartialType } from '@nestjs/swagger';

import { BnbSettingsDto } from './BnbSettingsDto';

export class BnbSettingsUpdateDto extends PartialType(BnbSettingsDto) {}
