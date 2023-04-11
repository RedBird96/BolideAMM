import { ApiProperty } from '@nestjs/swagger';
import { Farm } from 'src/modules/bnb/interfaces/farm.interface';
import type { ContractEntity } from 'src/modules/contracts/contract.entity';
import { ContractDto } from 'src/modules/contracts/dto/ContractDto';

export class PairDto extends ContractDto {
  @ApiProperty()
  farm: Farm;

  constructor(data: ContractEntity, farm: Farm) {
    super(data);

    this.farm = farm;
  }
}
