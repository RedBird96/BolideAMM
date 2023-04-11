import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { STRATEGY_TYPES } from 'src/common/constants/strategy-types';
import { AbstractDto } from 'src/common/dto/AbstractDto';
import { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import { LandBorrowFarmSettingsDto } from 'src/modules/land-borrow-farm-strategy/dto/LandBorrowFarmSettingsDto';
import { LandBorrowSettingsDto } from 'src/modules/land-borrow-strategy/dto/LandBorrowSettingsDto';

import { StrategyEntity } from '../strategy.entity';
import { StrategySettingsDto } from './StrategySettingsDto';

@ApiExtraModels(LandBorrowFarmSettingsDto, LandBorrowSettingsDto)
export class StrategyDto extends AbstractDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  blockchainId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  logicContractId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  storageContractId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  operationsPrivateKeyId: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  boostingPrivateKeyId: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  type: STRATEGY_TYPES;

  @ApiProperty()
  logicContract: ContractDto;

  @ApiProperty()
  storageContract: ContractDto;

  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(LandBorrowFarmSettingsDto) },
      { $ref: getSchemaPath(LandBorrowSettingsDto) },
    ],
  })
  @ValidateNested()
  settings: StrategySettingsDto;

  constructor(data: StrategyEntity) {
    super(data);

    this.name = data.name;
    this.isActive = data.isActive;
    this.blockchainId = data.blockchainId;
    this.logicContractId = data.logicContractId;
    this.storageContractId = data.storageContractId;
    this.operationsPrivateKeyId = data.operationsPrivateKeyId;
    this.boostingPrivateKeyId = data.boostingPrivateKeyId;
    this.settings = data.settings;
    this.type = data.type;
    this.logicContract = data.logicContract ? data.logicContract.toDto() : null;
    this.storageContract = data.storageContract
      ? data.storageContract.toDto()
      : null;
  }
}
