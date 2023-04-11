import {ethers, upgrades, network} from "hardhat";
import {sleep, verify} from "../utils/helpers";
import dotenv from "dotenv";
import "@openzeppelin/hardhat-upgrades";
import {ADDRESS_COLLECTION, PLATFORM} from "../data/addresses.json";
import {
  LendBorrowFarmStrategy__factory,
  Logic__factory,
} from "../typechain-types";

async function main() {
  let logic, strategy, tx;

  let strategyImpl = "";
  let logicImpl = "";
  dotenv.config();
  console.log("- LendBorrowFarm migration -");

  // @ts-ignore
  const addresses = ADDRESS_COLLECTION[network.config.addressesSet];
  const logicAddress = process.env.LBF_LOGIC_PROXY_ADDRESS!;
  const strategyAddress = process.env.LBF_STRATEGY_PROXY_ADDRESS!;
  const logicForceInit = Boolean(process.env.LBF_LOGIC_FORCE_INIT);
  const strategyForceInit = Boolean(process.env.LBF_STRATEGY_FORCE_INIT);
  const logicUpgrade = Boolean(process.env.LBF_LOGIC_FORCE_UPGRADE);
  const strategyUpgrade = Boolean(process.env.LBF_STRATEGY_FORCE_UPGRADE);
  const version = "1.1.0";
  const purpose = process.env.CONTRACT_PURPOSE || "";
  const contractEnv = process.env.CONTRACT_ENV || "";

  const multiLogicAddress = process.env.MULTILOGIC_PROXY_ADDRESS!;
  // @ts-ignore
  const platform = PLATFORM[network.name];
  const blidAddress = platform.blid;
  const expenseAddress = platform.expenses;

  let logicInit = Boolean(!logicAddress || logicForceInit);
  let strategyInit = Boolean(!strategyAddress || strategyForceInit);

  // ---
  console.log("- Validation -");
  // ---
  if (!multiLogicAddress) {
    console.warn("Please set the multilogic address");
    return;
  }

  if (!blidAddress) {
    console.warn("Please set the BLID token address");
    return;
  }

  if (!version) {
    console.warn("Please set the contacts version");
    return;
  }

  if ((logicInit || strategyInit) && !process.env.ETHERSCAN_APIKEY) {
    console.warn("Please set ETHERSCAN_APIKEY for contracts verification");
    return;
  }

  if ((!logicAddress || !strategyAddress) && !process.env.PRIVATE_KEY) {
    console.warn("Please set PRIVATE_KEY for deploy process");
    return;
  }

  if (logicInit && !expenseAddress) {
    console.warn("Please set EXPENSEADDRESS for deploy process");
    return;
  }

  if ((logicInit && logicUpgrade) || (strategyInit && strategyUpgrade)) {
    console.warn("force init and force upgrade cannot processed at once");
    return;
  }

  if (logicUpgrade && !logicAddress) {
    console.warn("to upgrade logic contract please set logicAddress");
    return;
  }

  if (strategyUpgrade && !strategyAddress) {
    console.warn("to upgrade strategy contract please set strategyAddress");
    return;
  }

  const [deployer] = await ethers.getSigners();

  console.log("* Account address:", deployer.address);
  console.log("* Account balance:", (await deployer.getBalance()).toString());
  console.log("* Multilogic address:", multiLogicAddress);
  console.log("* Logic address:", logicAddress);
  console.log("* Strategy address:", strategyAddress);
  console.log("* Logic force init:", logicForceInit);
  console.log("* Strategy force init:", strategyForceInit);
  console.log("* logic force upgrade:", logicUpgrade);
  console.log("* Strategy force upgrade:", strategyUpgrade);

  const logicFactory = await ethers.getContractFactory("Logic");
  const strategyFactory = await ethers.getContractFactory(
    "LendBorrowFarmStrategy"
  );

  // ---
  console.log("- Contracts initial deploy -");
  // ---
  if (!logicAddress) {
    console.log("- Deploy Logic -");
    logic = await upgrades.deployProxy(
      logicFactory,
      [
        expenseAddress,
        addresses.VenusController,
        addresses.OlaController,
        addresses.OlaRainMaker,
        addresses.PancakeRouter,
        addresses.ApeswapRouter,
        addresses.BiswapRouter,
        addresses.PancakeMasterV2,
        addresses.ApeswapMaster,
        addresses.BiswapMaster,
      ],
      {
        kind: "uups",
        initializer: "__Logic_init",
      }
    );
    await logic.deployed();

    logicImpl = await upgrades.erc1967.getImplementationAddress(logic.address);
    console.log("Logic Proxy:", logic.address);
    console.log("Logic Implementation:", logicImpl);
    // TODO: add saving to the Vault
  } else {
    logic = Logic__factory.connect(logicAddress, deployer);
  }

  if (!strategyAddress) {
    console.log("- Deploy Strategy -");
    strategy = await upgrades.deployProxy(
      strategyFactory,
      [
        addresses.VenusController,
        addresses.ApeswapRouter,
        addresses.Token.XVS.Underlying,
        logic.address,
      ],
      {
        kind: "uups",
        initializer: "__LendBorrowFarmStrategy_init",
      }
    );
    await strategy.deployed();

    strategyImpl = await upgrades.erc1967.getImplementationAddress(
      strategy.address
    );
    console.log("Strategy Proxy:", strategy.address);
    console.log("Strategy Implementation:", strategyImpl);
    // TODO: add saving to the Vault
  } else {
    strategy = LendBorrowFarmStrategy__factory.connect(
      strategyAddress,
      deployer
    );
  }

  // ---
  console.log("- First initialization after deployment -");
  // ---
  if (logicInit) {
    tx = await logic.connect(deployer).setMultiLogicProxy(multiLogicAddress);
    await tx.wait(1);
    tx = await logic.connect(deployer).setBLID(blidAddress);
    await tx.wait(1);
    tx = await logic.connect(deployer).setAdmin(strategy.address);
    await tx.wait(1);

    await logic
      .connect(deployer)
      .addXTokens(addresses.Token.XRP.Underlying, addresses.Token.XRP.Venus, 0);
    await logic
      .connect(deployer)
      .addXTokens(
        "0x0000000000000000000000000000000000000000",
        addresses.Token.BNB.Venus,
        0
      );

    await logic
      .connect(deployer)
      .approveTokenForSwap(addresses.SWAP.Ape.XRP_BNB.LP);
  }

  if (strategyInit) {
    tx = await strategy.connect(deployer).setMultiLogicProxy(multiLogicAddress);
    await tx.wait(1);
    tx = await strategy.connect(deployer).setBLID(blidAddress);
    await tx.wait(1);
    tx = await logic.connect(deployer).setAdmin(strategy.address);
    await tx.wait(1);

    await strategy
      .connect(deployer)
      .init(addresses.Token.BUSD.Underlying, addresses.Token.BUSD.Venus);
    await strategy
      .connect(deployer)
      .init(addresses.Token.USDT.Underlying, addresses.Token.USDT.Venus);
    await strategy
      .connect(deployer)
      .init(addresses.Token.DAI.Underlying, addresses.Token.DAI.Venus);
    await strategy
      .connect(deployer)
      .init(addresses.Token.USDC.Underlying, addresses.Token.USDC.Venus);
  }

  // ---
  console.log("- Upgrade -");
  // ---
  if (logicUpgrade) {
    const upgradedLogic = await upgrades.upgradeProxy(
      logicAddress,
      logicFactory
    );
    await upgradedLogic.deployed();

    logicImpl = await upgrades.erc1967.getImplementationAddress(
      upgradedLogic.address
    );
    console.log("New Logic Implementation:", logicImpl);
  }

  if (strategyUpgrade) {
    const upgradedStrategy = await upgrades.upgradeProxy(
      strategyAddress,
      strategyFactory
    );
    await upgradedStrategy.deployed();

    strategyImpl = await upgrades.erc1967.getImplementationAddress(
      upgradedStrategy.address
    );
    console.log("New Strategy Implementation:", strategyImpl);
  }

  // ---
  console.log("- Set version -");
  // ---
  if (logicInit || logicUpgrade) {
    await logic
      .connect(deployer)
      .upgradeVersion(version, contractEnv + " " + purpose);
  }
  if (strategyInit || strategyUpgrade) {
    await strategy
      .connect(deployer)
      .upgradeVersion(version, contractEnv + " " + purpose);
  }

  // ---
  console.log("- Verify contracts -");
  // ---
  console.log("Sleeping for 1 seconds before verification...");
  await sleep(1000);
  if (strategyInit || strategyUpgrade) {
    console.log("- Verify Strategy -");
    await verify(strategy.address);
  }
  if (logicInit || logicUpgrade) {
    console.log("- Verify Logic -");
    await verify(logic.address);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
