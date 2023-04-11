import type { LandBorrowFarmSettingsUpdateDto } from 'src/modules/land-borrow-farm-strategy/dto/LandBorrowFarmSettingsUpdateDto';
import type { LandBorrowSettingsUpdateDto } from 'src/modules/land-borrow-strategy/dto/LandBorrowSettingsUpdateDto';

export type StrategySettingsUpdateDto =
  | LandBorrowFarmSettingsUpdateDto
  | LandBorrowSettingsUpdateDto;
