import { PartialType } from '@nestjs/swagger';

import { LandBorrowSettingsDto } from './LandBorrowSettingsDto';

export class LandBorrowSettingsUpdateDto extends PartialType(
  LandBorrowSettingsDto,
) {}
