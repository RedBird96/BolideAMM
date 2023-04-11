import {
  FACTORY_ADDRESS_MAP,
  INIT_CODE_HASH_MAP,
  PAIR_ADDRESS_CACHE,
} from '@bolide/swap-sdk';
import { PLATFORMS } from 'src/common/constants/platforms';
import { safeBN, toWeiBN } from 'src/common/utils/big-number-utils';
import type { MulticallViewService } from 'src/modules/bnb/multicall/multicall-view.service';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import type { ContractsService } from 'src/modules/contracts/contracts.service';
import type { StrategiesService } from 'src/modules/strategies/strategies.service';

import { STATE } from './constants/state';
import { Deployer } from './Deployer';

process.env.OPERATIONS_PRIVATE_KEY_1 =
  'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
process.env.IS_TRANSACTION_PROD_MODE = 'true';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export class Mocker {
  initialState: any;

  initalTokenAddress: any;

  deployer: any;

  ethers: any;

  contractsService: ContractsService;

  multicallService: MulticallViewService | null;

  strategiesService: StrategiesService;

  hre: any;

  MAX: any;

  owner: any;

  TOKEN_LIST = [
    'BNB',
    'BLID',
    'BUSD',
    'USDT',
    'DAI',
    'LINK',
    'USDC',
    'BTC',
    'ETH',
  ];

  VENUS_TOKEN_LIST = ['vBNB', 'vUSDT', 'vLINK'];

  venusController = undefined;

  constructor({
    contractsService,
    strategiesService,
    multicallService = null,
    deployer,
    hre,
  }) {
    this.strategiesService = strategiesService;
    this.contractsService = contractsService;
    this.multicallService = multicallService;
    this.initialState = { ...STATE };

    this.ethers = hre.ethers;
    this.hre = hre;
    this.owner = deployer;
    this.MAX = this.ethers.constants.MaxUint256;
    this.deployer = new Deployer({ deployer: this.owner, ethers: this.ethers });
  }

  // порядок важен
  public async mock(data: { contracts: string[] }) {
    const { contracts = [] } = data;

    await this.resetNode();
    await this.disableLogging();
    await this.prepareTokens();

    if (contracts.includes('uniswap')) {
      await this.prepareUniswap();
    }

    if (contracts.includes('farm')) {
      await this.prepareFarm();
    }

    if (contracts.includes('venus')) {
      await this.prepareVenus();
    }

    if (contracts.includes('bolide')) {
      await this.prepareBolide(contracts);
    }
  }

  private async resetNode() {
    await this.hre.network.provider.send('hardhat_reset');
  }

  private async disableLogging() {
    await this.hre.network.provider.send('hardhat_setLoggingEnabled', [false]);
  }

  private async prepareTokens() {
    for (const symbol of this.TOKEN_LIST) {
      let token: any;

      const contracts = (
        await this.contractsService.getContracts({
          blockchainId: 1,
        })
      ).map((ctr) => ctr.toDto());

      if (symbol === 'BNB') {
        token = await this.deployer.deployWETH();
        await token.deposit({ value: safeBN(toWeiBN(1000)) });
      } else {
        token = await this.deployer.deployToken(symbol);
      }

      const dbToken = contracts.find(
        (contract) => contract.type === 'TOKEN' && symbol === contract.name,
      );

      if (dbToken) {
        await this.contractsService.updateContractById(dbToken.id, {
          address: token.address,
        });

        // VENUS -> INNER_TOKEN -> data -> baseContractAddress -> replace dups
        const dbVToken = contracts.find(
          (contract) =>
            contract.type === 'INNER_TOKEN' &&
            contract.platform === 'VENUS' &&
            contract.data.baseContractAddress.toLowerCase() ===
              dbToken.address.toLowerCase(),
        );

        if (dbVToken) {
          const data = {
            ...dbVToken.data,
            baseContractAddress: token.address,
          };

          await this.contractsService.updateContractById(dbVToken.id, { data });
        }

        // Storage of LOW_RISK_STRATEGY -> data -> approvedTokens -> replace dups
        const lrsStorage = contracts.find(
          (contract) =>
            contract.type === 'STR_STORAGE' &&
            contract.platform === 'BOLIDE' &&
            contract.name === 'Storage of LOW_RISK_STRATEGY',
        );

        if (lrsStorage) {
          const approvedTokens = lrsStorage.data.approvedTokens.map((adr) =>
            adr.toLowerCase() === dbToken.address.toLowerCase()
              ? token.address
              : adr,
          );

          if (
            approvedTokens.join('') !== lrsStorage.data.approvedTokens.join('')
          ) {
            const data = { ...lrsStorage.data, approvedTokens };
            await this.contractsService.updateContractById(lrsStorage.id, {
              data,
            });
          }
        }
      }
    }
  }

  private async prepareUniswap() {
    const bnbContract = await this.contractsService.getTokenByName(1, 'BNB');
    const WBNB = bnbContract.address;

    const [pancakeSwap, apeSwap, biSwap] = await Promise.all([
      this.deployer.deployUniswap(WBNB),
      this.deployer.deployUniswap(WBNB),
      this.deployer.deployUniswap(WBNB),
    ]);

    const routerList = await this.contractsService.getContracts({
      type: CONTRACT_TYPES.ROUTER,
    });

    for (const router of routerList) {
      let address: string;

      switch (router.platform) {
        case 'APESWAP': {
          address = apeSwap.router.address;

          break;
        }

        case 'PANCAKESWAP': {
          address = pancakeSwap.router.address;

          break;
        }

        case 'BISWAP': {
          address = biSwap.router.address;

          break;
        }

        default: {
          continue;
        }
      }

      await this.contractsService.updateContractById(router.id, { address });
    }

    for (const symbol of this.TOKEN_LIST) {
      const dbToken = await this.contractsService.getTokenByName(1, symbol);

      const TOKEN = await this.ethers.getContractFactory('Token');
      const token = TOKEN.attach(dbToken.address);
      await Promise.all([
        token.approve(pancakeSwap.router.address, this.MAX),
        token.approve(apeSwap.router.address, this.MAX),
      ]);
    }

    if (this.multicallService) {
      const { multicall2 } = await this.deployer.deployMulticall2();

      const multicallContracts = await this.contractsService.getContracts({
        blockchainId: 1,
        type: CONTRACT_TYPES.MULTICALL,
      });

      await this.contractsService.updateContractById(multicallContracts[0].id, {
        address: multicall2.address,
      });

      // this.multicallService.multicallAddress = multicall2.address;

      FACTORY_ADDRESS_MAP[56].pancakeswap = pancakeSwap.factory.address;
      FACTORY_ADDRESS_MAP[56].apeswap = apeSwap.factory.address;
      FACTORY_ADDRESS_MAP[56].biswap = biSwap.factory.address;

      const [pancakeswapHash, apeswapHash, biswapHash] = await Promise.all([
        pancakeSwap.factory.callStatic.INIT_CODE_PAIR_HASH(),
        apeSwap.factory.callStatic.INIT_CODE_PAIR_HASH(),
        biSwap.factory.callStatic.INIT_CODE_PAIR_HASH(),
      ]);

      INIT_CODE_HASH_MAP[56].pancakeswap = pancakeswapHash;
      INIT_CODE_HASH_MAP[56].apeswap = apeswapHash;
      INIT_CODE_HASH_MAP[56].biswap = biswapHash;

      PAIR_ADDRESS_CACHE.clear();
    }
  }

  private async prepareFarm() {
    const { cake, syrup, chef } = await this.deployer.deployFarm();

    await cake.transferOwnership(chef.address);
    await syrup.transferOwnership(chef.address);

    const LP_SXP_BNB = await this.deployer.deployToken('SXP-BNB');
    await chef.add('2000', LP_SXP_BNB.address, true);

    const farmContracts = (await this.contractsService.getFarmContracts(1)).map(
      (farm) => farm.toDto(),
    );

    const FARM_SXP_BNB = farmContracts.find(
      (farm) => farm.platform === 'APESWAP' && farm.data.pid === 35,
    );

    const data = { ...FARM_SXP_BNB.data, pid: 1 };
    await this.contractsService.updateContractById(FARM_SXP_BNB.id, {
      data,
      address: LP_SXP_BNB.address,
    });

    const chefContracts = await this.contractsService.getContracts({
      type: CONTRACT_TYPES.MASTER,
    });

    for (const chefC of chefContracts) {
      if (chefC.platform === 'APESWAP') {
        await this.contractsService.updateContractById(chefC.id, {
          address: chef.address,
        });
      }
    }
  }

  private async prepareVenus() {
    this.venusController = (await this.deployer.deployVController()).address;

    const vContracts = (
      await this.contractsService.getContracts({
        blockchainId: 1,
        type: CONTRACT_TYPES.INNER_TOKEN,
        platform: PLATFORMS.VENUS,
      })
    ).map((cnt) => cnt.toDto());

    const tContracts = (
      await this.contractsService.getContracts({
        blockchainId: 1,
        type: CONTRACT_TYPES.TOKEN,
      })
    ).map((cnt) => cnt.toDto());

    for (const symbol of this.VENUS_TOKEN_LIST) {
      for (const dbVToken of vContracts) {
        for (const dbToken of tContracts) {
          if (dbVToken.name === symbol && `v${dbToken.name}` === symbol) {
            const token = await this.deployer.deployVToken(
              dbToken.address,
              symbol,
            );

            await this.contractsService.updateContractById(dbVToken.id, {
              address: token.address,
            });
          }
        }
      }
    }
  }

  private async prepareBolide(contracts) {
    const routerList = await this.contractsService.getContracts({
      type: CONTRACT_TYPES.ROUTER,
    });

    const pancakeSwapRouter = routerList.find(
      (router) => router.platform === 'PANCAKESWAP',
    );

    const apeSwapRouter = routerList.find(
      (router) => router.platform === 'APESWAP',
    );

    const chefList = await this.contractsService.getContracts({
      type: CONTRACT_TYPES.MASTER,
    });

    const apeSwapMasterChief = chefList.find(
      (chef) => chef.platform === 'APESWAP',
    );

    const payload = {
      pancakeSwapRouter: pancakeSwapRouter.address,
      apeSwapRouter: apeSwapRouter.address,
      apeSwapMasterChief: apeSwapMasterChief.address,
    };

    const { storage, logic } = await this.deployer.deployBolide(
      payload,
      this.venusController,
    );
    const strategyId = 1;
    const strategy = await this.strategiesService.getStrategyById(strategyId);
    const { storageContractId, logicContractId } = strategy;
    const storageC = await this.contractsService.getContractById(
      storageContractId,
    );
    const logicC = await this.contractsService.getContractById(logicContractId);

    await this.contractsService.updateContractById(logicC.id, {
      address: logic.address,
    });

    await this.contractsService.updateContractById(storageC.id, {
      address: storage.address,
    });

    await storage.initialize(logic.address);
    await logic.setStorage(storage.address);

    const blid = await this.contractsService.getBlidContract(1);
    await storage.setBLID(blid.address);

    await this.owner.sendTransaction({
      to: logic.address,
      value: this.ethers.utils.parseUnits('10', 'ether').toHexString(),
    });

    // transfer & approve for logic contract
    for (const symbol of this.TOKEN_LIST) {
      const dbToken = await this.contractsService.getTokenByName(1, symbol);

      const TOKEN = await this.ethers.getContractFactory('Token');
      const token = TOKEN.attach(dbToken.address);
      const amount = symbol === 'BNB' ? 100 : 500_000;
      await token.transfer(logic.address, safeBN(toWeiBN(amount)));

      await Promise.all([
        token.approve(pancakeSwapRouter.address, this.MAX),
        token.approve(apeSwapRouter.address, this.MAX),
        logic.approveTokenForSwap(token.address),
      ]);
    }

    // approve for farming
    if (contracts.includes('farm')) {
      const farmContracts = (
        await this.contractsService.getFarmContracts(1)
      ).map((farm) => farm.toDto());

      const FARM_SXP_BNB = farmContracts.find(
        (farm) => farm.platform === 'APESWAP' && farm.data.pid === 1,
      );

      const LP_SXP_BNB_FACTORY = await this.ethers.getContractFactory('Token');
      const LP_SXP_BNB = LP_SXP_BNB_FACTORY.attach(FARM_SXP_BNB.address);
      await LP_SXP_BNB.transfer(logic.address, safeBN(toWeiBN(500_000)));
      await logic.approveTokenForSwap(LP_SXP_BNB.address);
    }

    // transfer & approve for venus
    if (contracts.includes('venus')) {
      const LOGIC_FACTORY = await this.ethers.getContractFactory('Logic');
      const LOGIC = LOGIC_FACTORY.attach(logic.address);

      const vContracts = (
        await this.contractsService.getContracts({
          blockchainId: 1,
          type: CONTRACT_TYPES.INNER_TOKEN,
          platform: PLATFORMS.VENUS,
        })
      ).map((cnt) => cnt.toDto());

      for (const symbol of this.VENUS_TOKEN_LIST) {
        for (const dbVToken of vContracts) {
          if (dbVToken.name === symbol) {
            await (symbol === 'vBNB'
              ? LOGIC.addVTokensTestMock(ZERO_ADDRESS, dbVToken.address)
              : LOGIC.addVTokensTestMock(
                  dbVToken.data.baseContractAddress,
                  dbVToken.address,
                ));

            const TOKEN = await this.ethers.getContractFactory('Token');
            const token = TOKEN.attach(dbVToken.data.baseContractAddress);
            const amount = symbol === 'vBNB' ? 10 : 50_000;
            await token.transfer(dbVToken.address, safeBN(toWeiBN(amount)));
          }
        }
      }
    }
  }

  public async addPools(pools) {
    for (const pool of pools) {
      const dbToken1 = await this.contractsService.getTokenByName(
        1,
        pool.first,
      );
      const dbToken2 = await this.contractsService.getTokenByName(
        1,
        pool.second,
      );

      const token1 = dbToken1.address;
      const token2 = dbToken2.address;
      const pancakeRouter = await this.ethers.getContractFactory(
        'UniswapV2Router02',
      );

      const routerList = await this.contractsService.getContracts({
        type: CONTRACT_TYPES.ROUTER,
      });
      const pancakeSwapRouter = routerList.find(
        (router) => router.platform === 'PANCAKESWAP',
      );

      const pancakeSwap = pancakeRouter.attach(pancakeSwapRouter.address);

      const price1 = pool.price[0] * pool.amount;
      const price2 = pool.price[1] * pool.amount;

      await pancakeSwap.addLiquidity(
        token1,
        token2,
        safeBN(toWeiBN(price1)),
        safeBN(toWeiBN(price2)),
        '0',
        '0',
        this.owner.address,
        this.MAX,
      );

      // const factoryAdd = await pancakeSwap.factory();
      // const pancakeFactory = await this.ethers.getContractFactory(
      //   'UniswapV2Factory',
      // );
      // const factory = pancakeFactory.attach(factoryAdd);
      // const pairAddress = await factory.getPair(token1, token2);
      // const TOKEN = await this.ethers.getContractFactory('Token');
      // const tokenC1 = await TOKEN.attach(token1);
      // const tokenC2 = await TOKEN.attach(token2);
      // const balance1 = await tokenC1.balanceOf(pairAddress);
      // const balance2 = await tokenC2.balanceOf(pairAddress);
      // console.log({ [pool.first]: balance1, [pool.second]: balance2 });
    }
  }
}
