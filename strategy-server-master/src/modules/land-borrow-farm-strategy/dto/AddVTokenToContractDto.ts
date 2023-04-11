import { ApiProperty } from '@nestjs/swagger';

export class AddVTokenToContractDto {
  @ApiProperty()
  token: string;
}
