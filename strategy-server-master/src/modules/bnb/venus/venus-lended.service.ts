import { Injectable, Logger } from '@nestjs/common';
import { toBN } from 'src/common/utils/big-number-utils';
import type { BigNumber } from 'src/common/utils/BigNumber';
import { TOKEN_NAMES } from 'src/modules/contracts/constants/token-names';
import type { ContractEntity } from 'src/modules/contracts/contract.entity';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import type { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import type { InnerTokenDto } from 'src/modules/contracts/dto/InnerTokenDataDto';
import type Web3 from 'web3';

import { BnbWeb3Service } from '../bnb-web3.service';
import { STORAGE } from '../bolide/storage';
import { TokenEthService } from '../token/token-eth.service';
import { VenusBalanceService } from './venus-balance.service';

@Injectable()
export class VenusLendedService {
  private readonly logger = new Logger(VenusLendedService.name);

  constructor(
    private readonly bnbWeb3Service: BnbWeb3Service,
    private readonly tokenEthService: TokenEthService,
    private readonly contractsService: ContractsService,
    private readonly venusBalanceService: VenusBalanceService,
  ) {}

  async getTokensDepositedInStorage(data: {
    tokens: ContractEntity[];
    web3: Web3;
    storageContract: ContractDto;
  }): Promise<Record<string, BigNumber>> {
    const { web3, tokens, storageContract } = data;

    const storageContractWeb3 = new web3.eth.Contract(
      STORAGE.abi,
      storageContract.address,
    );

    const calls = [];
    const tokenNames = [];
    const results = {};

    for (const token of tokens) {
      const { data: tokenData } = token;
      const baseTokenAddress = (tokenData as InnerTokenDto).baseContractAddress;
      const baseContractId = (tokenData as InnerTokenDto).baseContractId;

      const { name: baseContractName } =
        await this.contractsService.getContractById(baseContractId);

      calls.push(
        storageContractWeb3.methods.getTokenDeposited(baseTokenAddress),
      );

      tokenNames.push(baseContractName);
    }

    let callsResults;

    try {
      callsResults = await this.bnbWeb3Service.executeWeb3Batch(web3, calls);
    } catch (error) {
      this.logger.error({
        message: 'getTokensDepositedInStorage',
        error,
      });
    }

    for (const [i, callsResult] of callsResults.entries()) {
      results[tokenNames[i]] = toBN(callsResult);
    }

    return results;
  }

  async getLendedTokens(data: {
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
  }): Promise<
    Record<
      string,
      {
        diff: BigNumber;
        vTokenBalance: BigNumber;
      }
    >
  > {
    const { logicContract, storageContract, web3 } = data;

    const result = {};

    const bnbToken = await this.contractsService.getTokenByName(
      logicContract.blockchainId,
      TOKEN_NAMES.BNB,
    );

    const venusTokens = await this.contractsService.getVenusTokens(
      logicContract.blockchainId,
    );

    const depositedOnStorageMap = await this.getTokensDepositedInStorage({
      tokens: venusTokens,
      web3,
      storageContract,
    });

    const availableInStorageMap =
      await this.tokenEthService.getTokensBalanceInWallet({
        web3,
        tokens: venusTokens,
        walletAddress: storageContract.address,
        bnbToken,
        isUseBaseTokenAddress: true,
        isUseBaseTokenName: true,
        isBalanceInWei: true,
      });

    const availableInLogicMap =
      await this.tokenEthService.getTokensBalanceInWallet({
        web3,
        tokens: venusTokens,
        walletAddress: logicContract.address,
        bnbToken,
        isUseBaseTokenAddress: true,
        isUseBaseTokenName: true,
        isBalanceInWei: true,
      });

    const venusTokensBalanceMap =
      await this.venusBalanceService.getVTokensBalance({
        web3,
        venusTokens,
        logicContract,
      });

    for (const token of venusTokens) {
      const baseContractId = (token.data as InnerTokenDto).baseContractId;
      const { name: baseContractName } =
        await this.contractsService.getContractById(baseContractId);

      const depositedAmount = depositedOnStorageMap[baseContractName]
        ? depositedOnStorageMap[baseContractName]
        : toBN('0');

      const storageAmount = availableInStorageMap[baseContractName]
        ? availableInStorageMap[baseContractName]
        : toBN('0');

      const logicAmount = availableInLogicMap[baseContractName]
        ? availableInLogicMap[baseContractName]
        : toBN('0');

      const vTokenBalance = venusTokensBalanceMap[baseContractName]
        ? venusTokensBalanceMap[baseContractName]
        : toBN('0');

      const lendedAmount = depositedAmount.sub(storageAmount).sub(logicAmount);
      const tokensDiff = vTokenBalance.sub(lendedAmount);

      if (vTokenBalance.gt(toBN(0))) {
        result[baseContractName] = {
          diff: tokensDiff,
          vTokenBalance,
        };
      }
    }

    return result;
  }
}
