import { PartialType } from '@nestjs/swagger';

import { LandBorrowFarmSettingsDto } from './LandBorrowFarmSettingsDto';

export class LandBorrowFarmSettingsUpdateDto extends PartialType(
  LandBorrowFarmSettingsDto,
) {}
