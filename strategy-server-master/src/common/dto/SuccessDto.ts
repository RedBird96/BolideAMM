import { ApiProperty } from '@nestjs/swagger';

export class SuccessDto {
  @ApiProperty()
  readonly message: string;
}
