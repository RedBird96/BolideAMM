import { ApiProperty } from '@nestjs/swagger';
import { TransactionsByUidDto } from 'src/modules/bnb/dto/TransactionsByUidDto';

export class WithTransactionsRespDto extends TransactionsByUidDto {
  @ApiProperty()
  uid: string;
}
