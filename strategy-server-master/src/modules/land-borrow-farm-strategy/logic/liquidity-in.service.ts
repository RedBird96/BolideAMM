import { Injectable, Logger } from '@nestjs/common';
import {
  fromWei,
  fromWeiToStr,
  safeBN,
  toBN,
  toWei,
} from 'src/common/utils/big-number-utils';
import { BigNumber } from 'src/common/utils/BigNumber';
import { BnbUtilsService } from 'src/modules/bnb/bnb-utils.service';
import { ERC_20 } from 'src/modules/bnb/bolide/erc-20';
import type { ReserveLiquidity } from 'src/modules/bnb/bolide/interfaces/reserve-liquidity.interface';
import { LP_TOKEN } from 'src/modules/bnb/bolide/lp-token';
import { FarmEthService } from 'src/modules/bnb/farm/farm-eth.service';
import { MASTER_CHEF } from 'src/modules/bnb/farm/master-chef';
import { TokenEthService } from 'src/modules/bnb/token/token-eth.service';
import { TradeService } from 'src/modules/bnb/uniswap/trade-service/trade.service';
import { UniswapEthService } from 'src/modules/bnb/uniswap/uniswap-eth.service';
import { VenusEthService } from 'src/modules/bnb/venus/venus-eth.service';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { ContractsService } from 'src/modules/contracts/contracts.service';
import type { ContractDto } from 'src/modules/contracts/dto/ContractDto';
import type Web3 from 'web3';
import type { ContractSendMethod } from 'web3-eth-contract';

import type { PairAmountType } from '../../../common/interfaces/PairAmountType';
import { LOGIC } from '../../bnb/bolide/logic';
import type { Farm } from '../../bnb/interfaces/farm.interface';

@Injectable()
export class LiquidityInService {
  private readonly logger = new Logger(LiquidityInService.name);

  constructor(
    private readonly bnbUtilsService: BnbUtilsService,
    private readonly uniswapEthService: UniswapEthService,
    private readonly tokenEthService: TokenEthService,
    private readonly venusEthService: VenusEthService,
    private readonly farmEthService: FarmEthService,
    private readonly contractsService: ContractsService,
    private readonly tradeService: TradeService,
  ) {}

  // calculate amount of tokens to borrow and amount of tokens to create pair on farm. Liquidity - target pair USD value
  public async calcPairAmounts(data: {
    farm: Farm;
    liquidityWei: BigNumber;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
  }): Promise<PairAmountType> {
    const { farm, liquidityWei, logicContract, storageContract, web3 } = data;

    this.logger.debug({
      message: 'calcPairAmounts params',
      platform: farm.platform,
      pair: farm.pair,
      liquidity: fromWeiToStr(liquidityWei),
    });

    const { amount: token1availableAmount } =
      await this.tokenEthService.getTokenAvailableAmount({
        tokenAddress: farm.asset1Address,
        walletAddress: logicContract.address,
        storageContract,
        web3,
      });
    const { amount: token2availableAmount } =
      await this.tokenEthService.getTokenAvailableAmount({
        tokenAddress: farm.asset2Address,
        walletAddress: logicContract.address,
        storageContract,
        web3,
      });

    const token1Price = await this.uniswapEthService.getTokenPriceUSD({
      asset: farm.token1,
      platform: farm.platform,
      web3,
    });

    const p = await this.farmEthService.getTokensReserves({ farm, web3 });
    const x = p.token1.div(p.token0);

    const token1Amount = toWei(
      fromWei(liquidityWei).div(toBN(2)).div(fromWei(token1Price)),
    );
    const token2Amount = token1Amount.mul(x);

    const result: PairAmountType = {
      token1Amount,
      token1BorrowAmount: BigNumber.max(
        token1Amount.sub(token1availableAmount),
        toBN(0),
      ),
      token2Amount,
      token2BorrowAmount: BigNumber.max(
        token2Amount.sub(token2availableAmount),
        toBN(0),
      ),
    };

    this.logger.debug({
      message: 'calcPairAmounts result',
      liquidity: fromWeiToStr(liquidityWei.idiv(toBN(2))),
      token1Amount: fromWeiToStr(result.token1Amount),
      token2Amount: fromWeiToStr(result.token2Amount),
      token1BorrowAmount: fromWeiToStr(result.token1BorrowAmount),
      token2BorrowAmount: fromWeiToStr(result.token2BorrowAmount),
    });

    return result;
  }

  public async stakeAvailableLpTokenToFarm(data: {
    farm: Farm;
    uid: string;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
  }): Promise<{ tx: ContractSendMethod; meta: Record<string, unknown> }> {
    const { farm, uid, logicContract, storageContract, web3 } = data;

    this.logger.debug({
      message: 'executing stakeAvailableLpTokenToFarm',
      uid,
      farm,
      logicContract: logicContract.address,
      storageContract: storageContract.address,
    });

    const { amount } = await this.tokenEthService.getTokenAvailableAmount({
      tokenAddress: farm.lpAddress,
      walletAddress: logicContract.address,
      storageContract,
      web3,
    });

    const macterChef = await this.contractsService.getContract({
      blockchainId: logicContract.blockchainId,
      platform: farm.platform,
      type: CONTRACT_TYPES.MASTER,
    });

    const logicContractWeb3 = new web3.eth.Contract(
      LOGIC.abi,
      logicContract.address,
    );

    const tx = logicContractWeb3.methods.deposit(
      macterChef.address,
      farm.pid,
      safeBN(amount),
    );

    const meta = {
      swapMaster: macterChef.address,
      pid: farm.pid,
      amount: amount.toString(),
    };

    this.logger.debug({
      message: 'stakeAvailableLpTokenToFarm result',
      pair: farm.pair,
      platform: farm.platform,
      swapMaster: macterChef.address,
      pid: farm.pid,
      amount: amount.toString(),
    });

    return { tx, meta };
  }

  // adds element Reserve to Logic contract
  public async addReserveToLogic(data: {
    farm: Farm;
    uid: string;
    logicContract: ContractDto;
    storageContract: ContractDto;
    web3: Web3;
    isTransactionProdMode: boolean;
    isApiCall: boolean;
  }): Promise<
    { tx: ContractSendMethod; meta: Record<string, unknown> } | undefined
  > {
    const { farm, uid, logicContract, storageContract, web3, isApiCall } = data;

    const logicContractWeb3 = new web3.eth.Contract(
      LOGIC.abi,
      logicContract.address,
    );

    this.logger.debug({
      message: 'executing addReserveToLogic',
      pair: farm.pair,
      platform: farm.platform,
      uid,
    });

    const reserveAmount: number = await logicContractWeb3.methods
      .getReservesCount()
      .call();

    if (!isApiCall) {
      for (let i = 0; i < reserveAmount; i++) {
        const reserve: ReserveLiquidity = await logicContractWeb3.methods
          .getReserve(i)
          .call();

        if (reserve.lpToken === farm.lpAddress) {
          return;
        }
      }
    }

    const macterChef = await this.contractsService.getContract({
      blockchainId: logicContract.blockchainId,
      platform: farm.platform,
      type: CONTRACT_TYPES.MASTER,
    });

    const router = await this.contractsService.getContract({
      blockchainId: logicContract.blockchainId,
      platform: farm.platform,
      type: CONTRACT_TYPES.ROUTER,
    });

    const path = await this.getPathForFarm({
      farm,
      storageContract,
      logicContract,
      web3,
      uid,
    });

    const meta = {
      tokenA: await this.bnbUtilsService.prepareTokenAddress(
        farm.asset1Address,
      ),
      tokenB: await this.bnbUtilsService.prepareTokenAddress(
        farm.asset2Address,
      ),
      vTokenA: await this.venusEthService.getVToken({
        address: farm.asset1Address,
        storageContract,
      }),
      vTokenB: await this.venusEthService.getVToken({
        address: farm.asset2Address,
        storageContract,
      }),
      swap: router.address,
      swapMaster: macterChef.address,
      lpToken: farm.lpAddress,
      poolID: farm.pid,
      path,
    };

    const tx = logicContractWeb3.methods.addReserveLiquidity(meta);

    this.logger.debug({
      message: 'addReserveToLogic result',
      pair: farm.pair,
      platform: farm.platform,
      path,
    });

    return { tx, meta };
  }

  // returns path to calculate getAmountsOut to all tokens used by Storage
  async getPathForFarm(data: {
    farm: Farm;
    storageContract: ContractDto;
    logicContract: ContractDto;
    uid: string;
    web3: Web3;
  }) {
    const { farm, storageContract, logicContract, uid, web3 } = data;

    this.logger.debug({ message: 'executing getPathForFarm', farm });

    const macterChef = await this.contractsService.getContract({
      blockchainId: logicContract.blockchainId,
      platform: farm.platform,
      type: CONTRACT_TYPES.MASTER,
    });

    const masterChefWeb3 = new web3.eth.Contract(
      MASTER_CHEF,
      macterChef.address,
    );
    const lpTokenWeb3 = new web3.eth.Contract(LP_TOKEN, farm.lpAddress);
    const erc20Web3 = new web3.eth.Contract(ERC_20.abi, farm.asset1Address);

    const response = await masterChefWeb3.methods
      .userInfo(farm.pid, logicContract.address)
      .call();

    const depositedLp = toBN(response.amount);
    const totalSupplyLP = toBN(await lpTokenWeb3.methods.totalSupply().call());
    const totalXRPinLP = toBN(
      await erc20Web3.methods.balanceOf(farm.lpAddress).call(),
    );

    const amount = depositedLp.mul(totalSupplyLP).div(totalXRPinLP);

    const result = [];

    const storageTokens = await this.contractsService.getStorageTokens(
      storageContract,
    );

    for (const storageToken of storageTokens) {
      const { path } = await this.tradeService.getProfitTrade({
        platform: farm.platform,
        token1Name: farm.token1,
        token2Name: storageToken.name,
        amount,
        isReverseSwap: false,
        blockchainId: storageContract.blockchainId,
        uid,
      });

      if (path) {
        result.push(path);
      }
    }

    return result;
  }
}
