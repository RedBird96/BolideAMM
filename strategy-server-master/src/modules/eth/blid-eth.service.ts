import { Injectable, Logger } from '@nestjs/common';
import { fromWeiToStr, safeBN, toBN } from 'src/common/utils/big-number-utils';
import type { BigNumber } from 'src/common/utils/BigNumber';
import { ConfigService } from 'src/shared/services/config.service';
import type Web3 from 'web3';

import { BLID_EHT_ABI } from './blid-abi';

@Injectable()
export class BlidEthService {
  private readonly logger = new Logger(BlidEthService.name);

  constructor(private readonly configService: ConfigService) {}

  async getBlidContract(web3: Web3) {
    return new web3.eth.Contract(
      BLID_EHT_ABI,
      this.configService.ethSettings.blidAddress,
    );
  }

  async blidContractTotalSupply(web3: Web3): Promise<BigNumber> {
    const blidContract = await this.getBlidContract(web3);

    return blidContract.methods.totalSupply().call();
  }

  async getBlidTotalSupply(web3: Web3): Promise<string> {
    const result = await this.blidContractTotalSupply(web3);

    return fromWeiToStr(result);
  }

  async getBlidOnAddresses(web3: Web3): Promise<{
    privateSaleBalance: BigNumber;
    timelockMarketingContractBalance: BigNumber;
    timelockMarketingRecipientWalletBalance: BigNumber;
    timelockIncentivesContractBalance: BigNumber;
    timelockIncentivesRecipientWalletBalance: BigNumber;
    timelockCompanyContractBalance: BigNumber;
    timelockCompanyRecipientWalletBalance: BigNumber;
    timelockTeamContractFirstBalance: BigNumber;
    timelockTeamContractSecondBalance: BigNumber;
    timelockTeamRecipientWalletFirstBalance: BigNumber;
    timelockTeamREcipientWalletSecondBalance: BigNumber;
    futureDaoWalletBalance: BigNumber;
    futurePrivateSalesWalletBalance: BigNumber;
  }> {
    const {
      privateSaleWallet,
      timelockMarketingContract,
      timelockMarketingRecipientWallet,
      timelockIncentivesContract,
      timelockIncentivesRecipientWallet,
      timelockCompanyContract,
      timelockCompanyRecipientWallet,
      timelockTeamContractFirst,
      timelockTeamRecipientWalletSecond,
      timelockTeamRecipientWalletFirst,
      timelockTeamContractSecond,
      futureDaoWallet,
      futurePrivateSalesWallet,
    } = this.configService.ethSettings;

    const blidContract = await this.getBlidContract(web3);

    const [
      privateSaleBalance,
      timelockMarketingContractBalance,
      timelockMarketingRecipientWalletBalance,
      timelockIncentivesContractBalance,
      timelockIncentivesRecipientWalletBalance,
      timelockCompanyContractBalance,
      timelockCompanyRecipientWalletBalance,
      timelockTeamContractFirstBalance,
      timelockTeamContractSecondBalance,
      timelockTeamRecipientWalletFirstBalance,
      timelockTeamREcipientWalletSecondBalance,
      futureDaoWalletBalance,
      futurePrivateSalesWalletBalance,
    ] = await Promise.all([
      blidContract.methods.balanceOf(privateSaleWallet).call(),
      blidContract.methods.balanceOf(timelockMarketingContract).call(),
      blidContract.methods.balanceOf(timelockMarketingRecipientWallet).call(),
      blidContract.methods.balanceOf(timelockIncentivesContract).call(),
      blidContract.methods.balanceOf(timelockIncentivesRecipientWallet).call(),
      blidContract.methods.balanceOf(timelockCompanyContract).call(),
      blidContract.methods.balanceOf(timelockCompanyRecipientWallet).call(),
      blidContract.methods.balanceOf(timelockTeamContractFirst).call(),
      blidContract.methods.balanceOf(timelockTeamContractSecond).call(),
      blidContract.methods.balanceOf(timelockTeamRecipientWalletFirst).call(),
      blidContract.methods.balanceOf(timelockTeamRecipientWalletSecond).call(),
      blidContract.methods.balanceOf(futureDaoWallet).call(),
      blidContract.methods.balanceOf(futurePrivateSalesWallet).call(),
    ]);

    return {
      privateSaleBalance,
      timelockMarketingContractBalance,
      timelockMarketingRecipientWalletBalance,
      timelockIncentivesContractBalance,
      timelockIncentivesRecipientWalletBalance,
      timelockCompanyContractBalance,
      timelockCompanyRecipientWalletBalance,
      timelockTeamContractFirstBalance,
      timelockTeamContractSecondBalance,
      timelockTeamRecipientWalletFirstBalance,
      timelockTeamREcipientWalletSecondBalance,
      futureDaoWalletBalance,
      futurePrivateSalesWalletBalance,
    };
  }

  async getBlidOnAddressesFromWeiToString(web3: Web3): Promise<{
    privateSaleBalance: string;
    timelockMarketingContractBalance: string;
    timelockMarketingRecipientWalletBalance: string;
    timelockIncentivesContractBalance: string;
    timelockIncentivesRecipientWalletBalance: string;
    timelockCompanyContractBalance: string;
    timelockCompanyRecipientWalletBalance: string;
    timelockTeamContractFirstBalance: string;
    timelockTeamContractSecondBalance: string;
    timelockTeamRecipientWalletFirstBalance: string;
    timelockTeamREcipientWalletSecondBalance: string;
    futureDaoWalletBalance: string;
    futurePrivateSalesWalletBalance: string;
  }> {
    const result = await this.getBlidOnAddresses(web3);

    return {
      privateSaleBalance: fromWeiToStr(result.privateSaleBalance),
      timelockMarketingContractBalance: fromWeiToStr(
        result.timelockMarketingContractBalance,
      ),
      timelockMarketingRecipientWalletBalance: fromWeiToStr(
        result.timelockMarketingRecipientWalletBalance,
      ),
      timelockIncentivesContractBalance: fromWeiToStr(
        result.timelockIncentivesContractBalance,
      ),
      timelockIncentivesRecipientWalletBalance: fromWeiToStr(
        result.timelockIncentivesRecipientWalletBalance,
      ),
      timelockCompanyContractBalance: fromWeiToStr(
        result.timelockCompanyContractBalance,
      ),
      timelockCompanyRecipientWalletBalance: fromWeiToStr(
        result.timelockCompanyRecipientWalletBalance,
      ),
      timelockTeamContractFirstBalance: fromWeiToStr(
        result.timelockTeamContractFirstBalance,
      ),
      timelockTeamContractSecondBalance: fromWeiToStr(
        result.timelockTeamContractSecondBalance,
      ),
      timelockTeamRecipientWalletFirstBalance: fromWeiToStr(
        result.timelockTeamRecipientWalletFirstBalance,
      ),
      timelockTeamREcipientWalletSecondBalance: fromWeiToStr(
        result.timelockTeamREcipientWalletSecondBalance,
      ),
      futureDaoWalletBalance: fromWeiToStr(result.futureDaoWalletBalance),
      futurePrivateSalesWalletBalance: fromWeiToStr(
        result.futurePrivateSalesWalletBalance,
      ),
    };
  }

  async getBlidCirculatingSupply(web3: Web3): Promise<string> {
    const totalSupply = await this.blidContractTotalSupply(web3);

    const {
      privateSaleBalance,
      timelockMarketingContractBalance,
      timelockIncentivesContractBalance,
      timelockCompanyContractBalance,
      timelockTeamContractFirstBalance,
      timelockTeamRecipientWalletFirstBalance,
      futureDaoWalletBalance,
      futurePrivateSalesWalletBalance,
    } = await this.getBlidOnAddresses(web3);

    const result = toBN(safeBN(totalSupply))
      .sub(privateSaleBalance)
      .sub(timelockMarketingContractBalance)
      .sub(timelockIncentivesContractBalance)
      .sub(timelockCompanyContractBalance)
      .sub(timelockTeamContractFirstBalance)
      .sub(timelockTeamRecipientWalletFirstBalance)
      .sub(futureDaoWalletBalance)
      .sub(futurePrivateSalesWalletBalance);

    return fromWeiToStr(result);
  }
}
