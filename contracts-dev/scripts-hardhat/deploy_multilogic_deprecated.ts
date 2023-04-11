import {ethers, upgrades, run} from "hardhat";
import {sleep, verify} from "../utils/helpers";
import dotenv from "dotenv";
import "@openzeppelin/hardhat-upgrades";
import {ADDRESS_COLLECTION} from "../data/addresses.json";
import {
  LendBorrowFarmStrategy__factory,
  LendBorrowLendStrategy__factory,
  Logic__factory,
  StorageV3__factory,
  MultiLogic__factory,
} from "../typechain-types";

dotenv.config();

async function main() {
  const ADDRESSES = ADDRESS_COLLECTION.bscTestnet;

  const deployConfig = {
    lblLogic: {
      deploy: false,
      init: false,
      verify: false,
    },
    lblStrategy: {
      deploy: false,
      init: false,
      verify: false,
    },
    lbfLogic: {
      deploy: true,
      init: true,
      verify: true,
    },
    lbfStrategy: {
      deploy: true,
      init: false,
      verify: true,
    },
    storage: {
      deploy: false,
      init: false,
      verify: false,
    },
    multiLogic: {
      deploy: false,
      init: false,
      verify: false,
    },
    agreegator: {
      deploy: false,
      verify: false,
    },
  };

  const [deployer] = await ethers.getSigners();

  console.log("Account address:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const lblLogicAddress = process.env.LBL_LOGIC_PROXY_ADDRESS!;
  const lblStrategyAddress = process.env.LBL_STRATEGY_PROXY_ADDRESS!;
  const lbfLogicAddress = process.env.LBF_LOGIC_PROXY_ADDRESS!;
  const lbfStrategyAddress = process.env.LBF_STRATEGY_PROXY_ADDRESS!;
  const storageAddress = process.env.STORAGE_PROXY_ADDRESS!;
  const multiLogicAddress = process.env.MULTILOGIC_PROXY_ADDRESS!;

  let lblLogic,
    lblStrategy,
    lbfLogic,
    lbfStrategy,
    storage,
    aggregator,
    tx,
    multiLogic;

  // Deploy LendBorrowLend Logic
  if (deployConfig.lblLogic.deploy) {
    const Logic = await ethers.getContractFactory("Logic");
    lblLogic = await upgrades.deployProxy(
      Logic,
      [
        process.env.EXPENSEADDRESS,
        ADDRESSES.VenusController,
        ADDRESSES.OlaController,
        ADDRESSES.OlaRainMaker,
        ADDRESSES.PancakeRouter,
        ADDRESSES.ApeswapRouter,
        ADDRESSES.BiswapRouter,
        ADDRESSES.PancakeMasterV2,
        ADDRESSES.ApeswapMaster,
        ADDRESSES.BiswapMaster,
      ],
      {
        kind: "uups",
        initializer: "__Logic_init",
      }
    );
    await lblLogic.deployed();

    const logicImpl = await upgrades.erc1967.getImplementationAddress(
      lblLogic.address
    );
    console.log("LendBorrowLend Logic Proxy:", lblLogic.address);
    console.log("LendBorrowLend Logic Implementation:", logicImpl);
    console.log(
      "LendBorrowLend Logic ProxyAdmin:",
      await upgrades.erc1967.getAdminAddress(lblLogic.address)
    );

    if (deployConfig.lblLogic.verify) {
      console.log("Sleeping for 1 seconds before verification...");
      await sleep(1000);
      console.log(">>>>>>>>>>>> Verification >>>>>>>>>>>>");

      await verify(lblLogic.address);
      await verify(logicImpl);
    }
  } else {
    lblLogic = Logic__factory.connect(lblLogicAddress, deployer);
  }

  // Deploy LendBorrowFarm Logic
  if (deployConfig.lbfLogic.deploy) {
    const Logic = await ethers.getContractFactory("Logic");
    lbfLogic = await upgrades.deployProxy(
      Logic,
      [
        process.env.EXPENSEADDRESS,
        ADDRESSES.VenusController,
        ADDRESSES.OlaController,
        ADDRESSES.OlaRainMaker,
        ADDRESSES.PancakeRouter,
        ADDRESSES.ApeswapRouter,
        ADDRESSES.BiswapRouter,
        ADDRESSES.PancakeMasterV2,
        ADDRESSES.ApeswapMaster,
        ADDRESSES.BiswapMaster,
      ],
      {
        kind: "uups",
        initializer: "__Logic_init",
      }
    );
    await lbfLogic.deployed();

    const logicImpl = await upgrades.erc1967.getImplementationAddress(
      lbfLogic.address
    );
    console.log("LendBorrowFarm Logic Proxy:", lbfLogic.address);
    console.log("LendBorrowFarm Logic Implementation:", logicImpl);
    console.log(
      "LendBorrowFarm Logic ProxyAdmin:",
      await upgrades.erc1967.getAdminAddress(lbfLogic.address)
    );

    if (deployConfig.lbfLogic.verify) {
      console.log("Sleeping for 1 seconds before verification...");
      await sleep(1000);
      console.log(">>>>>>>>>>>> Verification >>>>>>>>>>>>");

      await verify(lbfLogic.address);
      await verify(logicImpl);
    }
  } else {
    lbfLogic = Logic__factory.connect(lbfLogicAddress, deployer);
  }

  // Deploy LendBorrowLendStrategy
  if (deployConfig.lblStrategy.deploy) {
    const LblStrategy = await ethers.getContractFactory(
      "LendBorrowLendStrategy"
    );
    lblStrategy = await upgrades.deployProxy(
      LblStrategy,
      [
        ADDRESSES.OlaController,
        ADDRESSES.ApeswapRouter,
        ADDRESSES.Token.BANANA.Underlying,
        lblLogic.address,
      ],
      {
        kind: "uups",
        initializer: "__LendBorrowLendStrategy_init",
      }
    );
    await lblStrategy.deployed();

    const lblStrategyImpl = await upgrades.erc1967.getImplementationAddress(
      lblStrategy.address
    );
    console.log("LendBorrowLendStrategy Proxy:", lblStrategy.address);
    console.log("LendBorrowLendStrategy Implementation:", lblStrategyImpl);
    console.log(
      "LendBorrowLendStrategy ProxyAdmin:",
      await upgrades.erc1967.getAdminAddress(lblStrategy.address)
    );

    if (deployConfig.lblStrategy.verify) {
      console.log("Sleeping for 1 seconds before verification...");
      await sleep(1000);
      console.log(">>>>>>>>>>>> Verification >>>>>>>>>>>>");

      await verify(lblStrategy.address);
      await verify(lblStrategyImpl);
    }
  } else {
    lblStrategy = LendBorrowLendStrategy__factory.connect(
      lblStrategyAddress,
      deployer
    );
  }

  // Deploy LendBorrowFarmStrategy
  if (deployConfig.lbfStrategy.deploy) {
    const LbfStrategy = await ethers.getContractFactory(
      "LendBorrowFarmStrategy"
    );
    lbfStrategy = await upgrades.deployProxy(
      LbfStrategy,
      [
        ADDRESSES.VenusController,
        ADDRESSES.ApeswapRouter,
        ADDRESSES.Token.XVS.Underlying,
        lbfLogic.address,
      ],
      {
        kind: "uups",
        initializer: "__LendBorrowFarmStrategy_init",
      }
    );
    await lbfStrategy.deployed();

    const lbfStrategyImpl = await upgrades.erc1967.getImplementationAddress(
      lbfStrategy.address
    );
    console.log("LendBorrowFarmStrategy Proxy:", lbfStrategy.address);
    console.log("LendBorrowFarmStrategy Implementation:", lbfStrategyImpl);
    console.log(
      "LendBorrowFarmStrategy ProxyAdmin:",
      await upgrades.erc1967.getAdminAddress(lbfStrategy.address)
    );

    if (deployConfig.lbfStrategy.verify) {
      console.log("Sleeping for 1 seconds before verification...");
      await sleep(1000);
      console.log(">>>>>>>>>>>> Verification >>>>>>>>>>>>");

      await verify(lbfStrategy.address);
      await verify(lbfStrategyImpl);
    }
  } else {
    lbfStrategy = LendBorrowFarmStrategy__factory.connect(
      lbfStrategyAddress,
      deployer
    );
  }

  // Deploy Storage
  if (deployConfig.storage.deploy) {
    const Storage = await ethers.getContractFactory("StorageV2");
    storage = await upgrades.deployProxy(Storage, [], {
      initializer: "initialize",
    });
    await storage.deployed();

    const storageImpl = await upgrades.erc1967.getImplementationAddress(
      storage.address
    );
    console.log("Storage Proxy:", storage.address);
    console.log("Storage Implementation:", storageImpl);
    console.log(
      "Storage ProxyAdmin:",
      await upgrades.erc1967.getAdminAddress(storage.address)
    );

    if (deployConfig.storage.verify) {
      console.log("Sleeping for 1 seconds before verification...");
      await sleep(1000);
      console.log(">>>>>>>>>>>> Verification >>>>>>>>>>>>");

      await verify(storage.address);
      await verify(storageImpl);
    }
  } else {
    storage = StorageV3__factory.connect(storageAddress, deployer);
  }

  // MultiLogic
  if (deployConfig.multiLogic.deploy) {
    const MultiLogic = await ethers.getContractFactory("MultiLogic");
    multiLogic = await upgrades.deployProxy(MultiLogic, [], {
      initializer: "initialize",
    });
    await multiLogic.deployed();

    const multilogicImpl = await upgrades.erc1967.getImplementationAddress(
      multiLogic.address
    );
    console.log("MultiLogic Proxy:", multiLogic.address);
    console.log("MultiLogic Implementation:", multilogicImpl);
    console.log(
      "MultiLogic ProxyAdmin:",
      await upgrades.erc1967.getAdminAddress(multiLogic.address)
    );

    if (deployConfig.multiLogic.verify) {
      console.log("Sleeping for 1 seconds before verification...");
      await sleep(1000);
      console.log(">>>>>>>>>>>> Verification >>>>>>>>>>>>");

      await verify(multiLogic.address);
      await verify(multilogicImpl);
    }
  } else {
    multiLogic = MultiLogic__factory.connect(multiLogicAddress, deployer);
  }

  // Aggregator
  if (deployConfig.agreegator.deploy) {
    const Aggregator = await ethers.getContractFactory("AggregatorN3");
    aggregator = await Aggregator.deploy();
    await aggregator.deployed();

    console.log("Aggregator address:", aggregator.address);

    if (deployConfig.agreegator.verify) {
      console.log("Sleeping for 1 seconds before verification...");
      await sleep(1000);
      console.log(">>>>>>>>>>>> Verification >>>>>>>>>>>>");

      await verify(aggregator.address);
    }
  }

  // ********** First initialization after deployment ********** //
  if (deployConfig.storage.init) {
    tx = await storage.connect(deployer).setBLID(process.env.BLIDADDRESS);
    await tx.wait(1);
    tx = await storage.connect(deployer).setMultiLogicProxy(multiLogic.address);
    await tx.wait(1);
  }

  if (deployConfig.multiLogic.init) {
    tx = await multiLogic.connect(deployer).setStorage(storage.address);
    await tx.wait(1);

    tx = await multiLogic.connect(deployer).initStrategies(
    ["LBF", "LBL"],
    [
      {
        logicContract: lbfLogic.address,
        strategyContract: lbfStrategy.address,
      },
      {
        logicContract: lblLogic.address,
        strategyContract: lblStrategy.address,
      },
    ]);
    await tx.wait(1);

    if (!deployConfig.storage.deploy) {
      tx = await storage
        .connect(deployer)
        .setMultiLogicProxy(multiLogic.address);
      await tx.wait(1);
    }
  }

  if (deployConfig.lblLogic.init) {
    tx = await lblLogic
      .connect(deployer)
      .setMultiLogicProxy(multiLogic.address);
    await tx.wait(1);
    tx = await lblLogic.connect(deployer).setBLID(process.env.BLIDADDRESS);
    await tx.wait(1);
    tx = await lblLogic.connect(deployer).setAdmin(lblStrategy.address);
    await tx.wait(1);
  }

  if (deployConfig.lbfLogic.init) {
    tx = await lbfLogic
      .connect(deployer)
      .setMultiLogicProxy(multiLogic.address);
    await tx.wait(1);
    tx = await lbfLogic.connect(deployer).setBLID(process.env.BLIDADDRESS);
    await tx.wait(1);
    tx = await lbfLogic.connect(deployer).setAdmin(lbfStrategy.address);
    await tx.wait(1);
  }

  if (deployConfig.lblStrategy.init) {
    tx = await lblStrategy
      .connect(deployer)
      .setMultiLogicProxy(multiLogic.address);
    await tx.wait(1);
    tx = await lblStrategy.connect(deployer).setBLID(process.env.BLIDADDRESS);
    await tx.wait(1);

    if (!deployConfig.lblLogic.deploy) {
      tx = await lblLogic.connect(deployer).setAdmin(lblStrategy.address);
      await tx.wait(1);
    }
  }

  if (deployConfig.lbfStrategy.init) {
    tx = await lbfStrategy
      .connect(deployer)
      .setMultiLogicProxy(multiLogic.address);
    await tx.wait(1);
    tx = await lbfStrategy.connect(deployer).setBLID(process.env.BLIDADDRESS);
    await tx.wait(1);

    if (!deployConfig.lbfLogic.deploy) {
      tx = await lbfLogic.connect(deployer).setAdmin(lbfStrategy.address);
      await tx.wait(1);
    }
  }

  // await multiLogic.connect(deployer).setPercentages(ADDRESSES.Token.BTC.Underlying, [3000,7000]);
  // await multiLogic.connect(deployer).setPercentages(ADDRESSES.Token.ETH.Underlying, [3000,7000]);
  // await multiLogic.connect(deployer).setPercentages(ADDRESSES.Token.BUSD.Underlying, [10000,0]);
  // await multiLogic.connect(deployer).setPercentages(ADDRESSES.Token.USDT.Underlying, [5000,5000]);
  // await multiLogic.connect(deployer).setPercentages(ADDRESSES.Token.USDC.Underlying, [3000,7000]);
  // await multiLogic.connect(deployer).setPercentages(ADDRESSES.Token.DAI.Underlying, [3000,7000]);

  // ********** Approve tokens for swap after first deploy ********** //
  // await storage.connect(deployer).addToken(ADDRESSES.Token.BTC.Underlying, ADDRESSES.CHAINLINK.BTC);
  // await storage.connect(deployer).addToken(ADDRESSES.Token.ETH.Underlying, ADDRESSES.CHAINLINK.ETH);
  // await storage.connect(deployer).addToken(ADDRESSES.Token.BUSD.Underlying, ADDRESSES.CHAINLINK.BUSD);
  // await storage.connect(deployer).addToken(ADDRESSES.Token.USDT.Underlying, ADDRESSES.CHAINLINK.USDT);
  // await storage.connect(deployer).addToken(ADDRESSES.Token.USDC.Underlying, ADDRESSES.CHAINLINK.USDC);
  // await storage.connect(deployer).addToken(ADDRESSES.Token.DAI.Underlying, ADDRESSES.CHAINLINK.DAI);

  //******** Multi Vault(Storage) *****************/
  // await storage.connect(deployer).addToken(ADDRESSES.Token.XRP.Underlying, ADDRESSES.CHAINLINK.XRP);
  // await storage.connect(deployer).addToken(ADDRESSES.Token.SXP.Underlying, ADDRESSES.CHAINLINK.SXP);
  // await storage.connect(deployer).addToken(ADDRESSES.Token.BCH.Underlying, ADDRESSES.CHAINLINK.BCH);
  // await storage.connect(deployer).addToken(ADDRESSES.Token.LINK.Underlying, ADDRESSES.CHAINLINK.LINK);
  // await storage.connect(deployer).addToken(ADDRESSES.Token.DOT.Underlying, ADDRESSES.CHAINLINK.DOT);
  // await storage.connect(deployer).addToken(ADDRESSES.Token.LTC.Underlying, ADDRESSES.CHAINLINK.LTC);
  // await storage.connect(deployer).addToken(ADDRESSES.Token.FIL.Underlying, ADDRESSES.CHAINLINK.FIL);
  // await storage.connect(deployer).addToken(ADDRESSES.Token.MATIC.Underlying, ADDRESSES.CHAINLINK.MATIC);

  // await logic.connect(deployer).approveTokenForSwap(ADDRESSES.Token.XVS.Underlying);
  // await logic.connect(deployer).approveTokenForSwap(ADDRESSES.Token.BANANA.Underlying);
  // await logic.connect(deployer).approveTokenForSwap(ADDRESSES.Token.CAKE.Underlying);
  // await logic.connect(deployer).approveTokenForSwap(ADDRESSES.Token.BSW.Underlying);
  // await logic.connect(deployer).approveTokenForSwap(process.env.BLIDADDRESS);

  // await logic.connect(deployer).enterMarkets([ADDRESSES.Token.BUSD.Venus, ADDRESSES.Token.USDT.Venus, ADDRESSES.Token.DAI.Venus, ADDRESSES.Token.USDC.Venus]);
  //******** Multi Vault(Logic enterMarkets) *****************/
  // await logic.connect(deployer).enterMarkets([
  //   ADDRESSES.Token.XRP.Venus, ADDRESSES.Token.SXP.Venus, ADDRESSES.Token.BCH.Venus, ADDRESSES.Token.LINK.Venus,
  //   ADDRESSES.Token.DOT.Venus, ADDRESSES.Token.LTC.Venus, ADDRESSES.Token.FIL.Venus, ADDRESSES.Token.MATIC.Venus
  // ]);

  // ********* Add Venus Tokens ********** //
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.USDT.Underlying, ADDRESSES.Token.USDT.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.BUSD.Underlying, ADDRESSES.Token.BUSD.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.USDC.Underlying, ADDRESSES.Token.USDC.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.XVS.Underlying, ADDRESSES.Token.XVS.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.SXP.Underlying, ADDRESSES.Token.SXP.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.BCH.Underlying, ADDRESSES.Token.BCH.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.BTC.Underlying, ADDRESSES.Token.BTC.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.ETH.Underlying, ADDRESSES.Token.ETH.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.LTC.Underlying, ADDRESSES.Token.LTC.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.XRP.Underlying, ADDRESSES.Token.XRP.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.CAKE.Underlying, ADDRESSES.Token.CAKE.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.MATIC.Underlying, ADDRESSES.Token.MATIC.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.DOGE.Underlying, ADDRESSES.Token.DOGE.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.ADA.Underlying, ADDRESSES.Token.ADA.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.BETH.Underlying, ADDRESSES.Token.BETH.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.FIL.Underlying, ADDRESSES.Token.FIL.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.DAI.Underlying, ADDRESSES.Token.DAI.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.LINK.Underlying, ADDRESSES.Token.LINK.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.DOT.Underlying, ADDRESSES.Token.DOT.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.TRX.Underlying, ADDRESSES.Token.TRX.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.TUSD.Underlying, ADDRESSES.Token.TUSD.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.AAVE.Underlying, ADDRESSES.Token.AAVE.Venus);
  // await logic.connect(deployer).addVTokens(ADDRESSES.Token.CAN.Underlying, ADDRESSES.Token.CAN.Venus);
  // await logic.connect(deployer).addVTokens("0x0000000000000000000000000000000000000000",ADDRESSES.Token.BNB.Venus);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
