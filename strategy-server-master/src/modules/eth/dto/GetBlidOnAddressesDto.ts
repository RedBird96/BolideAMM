import { ApiProperty } from '@nestjs/swagger';
import { IsDecimal } from 'class-validator';

export class GetBlidOnAddressesDto {
  @ApiProperty()
  @IsDecimal()
  privateSaleBalance: string;

  @ApiProperty()
  @IsDecimal()
  timelockMarketingContractBalance: string;

  @ApiProperty()
  @IsDecimal()
  timelockMarketingRecipientWalletBalance: string;

  @ApiProperty()
  @IsDecimal()
  timelockIncentivesContractBalance: string;

  @ApiProperty()
  @IsDecimal()
  timelockIncentivesRecipientWalletBalance: string;

  @ApiProperty()
  @IsDecimal()
  timelockCompanyContractBalance: string;

  @ApiProperty()
  @IsDecimal()
  timelockCompanyRecipientWalletBalance: string;

  @ApiProperty()
  @IsDecimal()
  timelockTeamContractFirstBalance: string;

  @ApiProperty()
  @IsDecimal()
  timelockTeamContractSecondBalance: string;

  @ApiProperty()
  @IsDecimal()
  timelockTeamRecipientWalletFirstBalance: string;

  @ApiProperty()
  @IsDecimal()
  timelockTeamREcipientWalletSecondBalance: string;

  @ApiProperty()
  @IsDecimal()
  futureDaoWalletBalance: string;

  @ApiProperty()
  @IsDecimal()
  futurePrivateSalesWalletBalance: string;
}
