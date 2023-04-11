import { Injectable, Logger } from '@nestjs/common';
import { PLATFORMS } from 'src/common/constants/platforms';
import { fromWeiToStr, toBN } from 'src/common/utils/big-number-utils';
import type Web3 from 'web3';

import { TokenEthService } from '../bnb/token/token-eth.service';
import { UniswapEthService } from '../bnb/uniswap/uniswap-eth.service';
import { VenusEthService } from '../bnb/venus/venus-eth.service';
import { TOKEN_NAMES } from '../contracts/constants/token-names';
import { ContractsService } from '../contracts/contracts.service';
import type { ContractDto } from '../contracts/dto/ContractDto';

@Injectable()
export class ClaimVenusService {
  private readonly logger = new Logger(ClaimVenusService.name);

  constructor(
    private readonly venusEthService: VenusEthService,
    private readonly uniswapEthService: UniswapEthService,
    private readonly tokenEthService: TokenEthService,
    private readonly contractsService: ContractsService,
  ) {}

  async claimVenusRewards(data: {
    uid: string;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }) {
    const { uid, logicContract, storageContract, web3, isTransactionProdMode } =
      data;

    // venus Bonuses
    let earnedAmount = toBN(0);

    await this.venusEthService.claimVenus({
      uid,
      storageContract,
      logicContract,
      web3,
      isTransactionProdMode,
    });

    const [baseToken, xvsToken] = await this.contractsService.getTokensByNames(
      logicContract.blockchainId,
      [TOKEN_NAMES.BLID, TOKEN_NAMES.XVS],
    );

    const { amount: venusRewards } =
      await this.tokenEthService.getTokenAvailableAmount({
        tokenAddress: xvsToken.address,
        walletAddress: logicContract.address,
        storageContract,
        web3,
      });

    if (venusRewards.gt(toBN(0))) {
      await this.uniswapEthService.swap({
        token1: xvsToken.address,
        token2: baseToken.address,
        amount: venusRewards,
        platform: PLATFORMS.PANCAKESWAP,
        uid,
        storageContract,
        logicContract,
        web3,
        isTransactionProdMode,
      });

      earnedAmount = earnedAmount.add(
        await this.uniswapEthService.getTokenConversionRate({
          asset: 'XVS',
          platform: PLATFORMS.PANCAKESWAP,
          assetTo: baseToken.name,
          amount: venusRewards,
          web3,
        }),
      );
    }

    this.logger.debug({
      message: 'claimVenusRewards result',
      earnedAmount: fromWeiToStr(earnedAmount),
    });

    return earnedAmount;
  }
}
