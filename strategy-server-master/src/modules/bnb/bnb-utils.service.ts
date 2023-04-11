import { Injectable, Logger } from '@nestjs/common';
import { toBN } from 'src/common/utils/big-number-utils';
import type { BigNumber } from 'src/common/utils/BigNumber';
import type Web3 from 'web3';

import { PLATFORMS } from '../../common/constants/platforms';
import { BlockchainsService } from '../blockchains/blockchains.service';
import { TOKEN_NAMES } from '../contracts/constants/token-names';
import { ContractsService } from '../contracts/contracts.service';
import type { ContractDto } from '../contracts/dto/ContractDto';
import type { InnerTokenDto } from '../contracts/dto/InnerTokenDataDto';

@Injectable()
export class BnbUtilsService {
  private readonly logger = new Logger(BnbUtilsService.name);

  public ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  constructor(
    private readonly blockchainsService: BlockchainsService,
    private readonly contractsService: ContractsService,
  ) {}

  async getDecimals(address: string) {
    const bnbBlockchain =
      await this.blockchainsService.getBnbBlockchainEntity();

    const token = await this.contractsService.getTokenByAddress(
      bnbBlockchain.id,
      address,
    );

    return token?.name === TOKEN_NAMES.DOGE ? 8 : 18;
  }

  async getVTokenNameByAddress(address: string) {
    const bnbBlockchain =
      await this.blockchainsService.getBnbBlockchainEntity();

    const vToken = await this.contractsService.getInnerToken({
      blockchainId: bnbBlockchain.id,
      platform: PLATFORMS.VENUS,
      address,
    });

    if (vToken) {
      return vToken.name;
    }

    throw new Error(`token ${address} not found`);
  }

  async getTokenNameByAddress(data: {
    address: string;
    isStrict?: boolean;
    storageContract: ContractDto;
  }): Promise<string | null> {
    const { address, isStrict = true, storageContract } = data;

    if (address.length < 12) {
      return null;
    }

    const stotageToken = await this.contractsService.getStorageTokenByAddress(
      address,
      storageContract,
    );

    if (stotageToken) {
      return stotageToken.name;
    }

    const bnbBlockchain =
      await this.blockchainsService.getBnbBlockchainEntity();

    const venusToken = await this.contractsService.getInnerToken({
      blockchainId: bnbBlockchain.id,
      platform: PLATFORMS.VENUS,
      baseTokenAddress: address,
    });

    if (venusToken) {
      const baseToken = await this.contractsService.getTokenByAddress(
        bnbBlockchain.id,
        (venusToken.data as InnerTokenDto).baseContractAddress,
      );

      return baseToken.name;
    }

    const token = await this.contractsService.getTokenByAddress(
      bnbBlockchain.id,
      address,
    );

    if (
      token?.name === TOKEN_NAMES.BLID ||
      token?.name === TOKEN_NAMES.BANANA ||
      token?.name === TOKEN_NAMES.BSW
    ) {
      return token.name;
    }

    if (isStrict) {
      throw new Error(`token ${address} not found`);
    } else {
      return null;
    }
  }

  getTokenNameByAddressArr(data: {
    tokens: string[];
    storageContract: ContractDto;
  }) {
    const { tokens, storageContract } = data;

    return tokens.map((address) =>
      this.getTokenNameByAddress({ address, storageContract }),
    );
  }

  async getTokenAddressesByName(name: string) {
    if (name.length > 12) {
      return name;
    }

    const bnbBlockchain =
      await this.blockchainsService.getBnbBlockchainEntity();

    const token = await this.contractsService.getTokenByName(
      bnbBlockchain.id,
      name,
    );

    if (token) {
      return token?.address;
    }

    const venusToken = await this.contractsService.getInnerToken({
      blockchainId: bnbBlockchain.id,
      platform: PLATFORMS.VENUS,
      baseTokenName: name,
    });

    if (venusToken) {
      return (venusToken.data as InnerTokenDto).baseContractAddress;
    }

    throw new Error(`token ${name} not found`);
  }

  async getGasPrice(web3: Web3): Promise<BigNumber> {
    const gasPrice = await web3.eth.getGasPrice();

    return toBN(gasPrice);
  }

  prepareName(symbol0: string) {
    return symbol0.toUpperCase().replace('WBNB', 'BNB').replace('BTCB', 'BTC');
  }

  // used in reserves creation, BNB = zero address
  async prepareTokenAddress(address: string) {
    const bnbBlockchain =
      await this.blockchainsService.getBnbBlockchainEntity();

    const token = await this.contractsService.getTokenByAddress(
      bnbBlockchain.id,
      address,
    );

    if (token.name === TOKEN_NAMES.BNB) {
      return this.ZERO_ADDRESS;
    }

    return address;
  }
}
