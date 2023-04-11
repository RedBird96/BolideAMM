import { ApiProperty } from '@nestjs/swagger';

export class ApproveTokenForSwapDto {
  @ApiProperty()
  token: string;
}
