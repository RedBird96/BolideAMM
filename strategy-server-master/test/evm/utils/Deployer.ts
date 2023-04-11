import type {
  CakeToken,
  MasterChef,
  SyrupBar,
  Token,
  UniswapV2Factory,
  VController,
  WETH9,
} from '../typechain';

export class Deployer {
  ethers: any;

  deployer: any;

  constructor({ ethers, deployer }) {
    this.ethers = ethers;
    this.deployer = deployer;
  }

  public async deployToken(symbol: string): Promise<Token> {
    const tokenFactory = await this.ethers.getContractFactory(
      'Token',
      this.deployer,
    );

    return tokenFactory.deploy(`${symbol} Token`, symbol);
  }

  public async deployVToken(token: string, symbol: string): Promise<Token> {
    const tokenFactory = await this.ethers.getContractFactory(
      'vToken',
      this.deployer,
    );

    return tokenFactory.deploy(token, `Venus ${symbol} Token`, `v${symbol}`);
  }

  public async deployVController(): Promise<VController> {
    const vControllerFactory = await this.ethers.getContractFactory(
      'vController',
      this.deployer,
    );

    return vControllerFactory.deploy();
  }

  public async deployWETH(): Promise<WETH9> {
    const tokenFactory = await this.ethers.getContractFactory(
      'WETH9',
      this.deployer,
    );

    return tokenFactory.deploy();
  }

  public async deployUniswap(WETH: string) {
    const uniswapFactory = await this.ethers.getContractFactory(
      'UniswapV2Factory',
      this.deployer,
    );

    const factory: UniswapV2Factory = await uniswapFactory.deploy(
      this.deployer.address,
    );

    const uniswapRouter = await this.ethers.getContractFactory(
      'UniswapV2Router02',
      this.deployer,
    );

    const router = await uniswapRouter.deploy(factory.address, WETH);

    return { factory, router };
  }

  public async deployFarm() {
    const cakeFactory = await this.ethers.getContractFactory(
      'CakeToken',
      this.deployer,
    );

    const cake: CakeToken = await cakeFactory.deploy();
    const syrupFactory = await this.ethers.getContractFactory(
      'SyrupBar',
      this.deployer,
    );

    const syrup: SyrupBar = await syrupFactory.deploy(cake.address);
    const chefFactory = await this.ethers.getContractFactory(
      'MasterChef',
      this.deployer,
    );

    const chef: MasterChef = await chefFactory.deploy(
      cake.address,
      syrup.address,
      this.deployer.address,
      '1000',
      '100',
    );

    return { cake, syrup, chef };
  }

  public async deployBolide(
    state,
    venusController = '0x0000000000000000000000000000000000000001',
  ) {
    const storageFactory = await this.ethers.getContractFactory(
      'StorageV0',
      this.deployer,
    );

    const storage = await storageFactory.deploy();

    const logicFactory = await this.ethers.getContractFactory(
      'Logic',
      this.deployer,
    );

    const logicArgs = [
      this.deployer.address,
      venusController,
      state.pancakeSwapRouter,
      state.apeSwapRouter,
      '0x0000000000000000000000000000000000000002', // pancakeMaster_
      state.apeSwapMasterChief, // apeswapMaster_
    ];

    const logic = await logicFactory.deploy(...logicArgs);

    return { storage, logic };
  }

  public async deployMulticall2() {
    const multicall2Factory = await this.ethers.getContractFactory(
      'Multicall2',
      this.deployer,
    );

    const multicall2 = await multicall2Factory.deploy();

    return { multicall2 };
  }
}
