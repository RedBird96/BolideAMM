import {ethers, upgrades, network} from "hardhat";
import {sleep, verify} from "../utils/helpers";
import dotenv from "dotenv";
import "@openzeppelin/hardhat-upgrades";
import {ADDRESS_COLLECTION, PLATFORM} from "../data/addresses.json";
import {StorageV3__factory, MultiLogic__factory} from "../typechain-types";
import yn from "yn";

async function main() {
  let storage, tx, multiLogic;

  let storageImpl = "";
  let multiLogicImpl = "";
  let aggregatorImpl = "";
  dotenv.config();

  console.log("- Multilogic migration -");

  // @ts-ignore is required
  const platform = PLATFORM[network.name];
  // @ts-ignore is required
  const addresses = ADDRESS_COLLECTION[network.config.addressesSet];

  const multiLogicForceInit = yn(process.env.MULTILOGIC_FORCE_INIT);
  const storageForceInit = yn(process.env.STORAGE_FORCE_INIT);
  const multiLogicUpgrade = yn(process.env.MULTILOGIC_FORCE_UPGRADE);
  const storageUpgrade = yn(process.env.STORAGE_FORCE_UPGRADE);
  const version = process.env.CONTRACT_VERSION;
  const purpose = process.env.CONTRACT_PURPOSE || "";
  const contractEnv = process.env.CONTRACT_ENV || "";
  const multiLogicAddress = process.env.MULTILOGIC_PROXY_ADDRESS!;
  const storageAddress = process.env.STORAGE_PROXY_ADDRESS!;
  const aggregatorAddress = process.env.AGGREGATOR_ADDRESS!;
  const blidAddress = platform.blid;
  const boostingAddress = platform.boosting;

  let multiLogicInit = Boolean(!multiLogicAddress || multiLogicForceInit);
  let storageInit = Boolean(!storageAddress || storageForceInit);

  // ---
  console.log("- Validation -");
  // ---

  if (!blidAddress) {
    console.warn("Please set the BLID token address");
    return;
  }

  if (!version) {
    console.warn("Please set the contacts version");
    return;
  }

  if ((multiLogicInit || storageInit) && !process.env.ETHERSCAN_APIKEY) {
    console.warn("Please set ETHERSCAN_APIKEY for contracts verification");
    return;
  }

  if (
    (!multiLogicAddress || !storageAddress || !aggregatorAddress) &&
    !process.env.PRIVATE_KEY
  ) {
    console.warn("Please set PRIVATE_KEY for deploy process");
    return;
  }

  if (storageInit && !boostingAddress) {
    console.warn("Please set BOOSTINGADDRESS for deploy process");
    return;
  }

  if (
    (multiLogicForceInit && multiLogicUpgrade) ||
    (storageForceInit && storageUpgrade)
  ) {
    console.warn("force init and force upgrade cannot processed at once");
    return;
  }

  if (multiLogicUpgrade && !multiLogicAddress) {
    console.warn("to upgrade multilogic please set multiLogicAddress");
    return;
  }

  if (storageUpgrade && !storageAddress) {
    console.warn("to upgrade storage please set storageAddress");
    return;
  }

  const [deployer] = await ethers.getSigners();

  console.log("* Account address:", deployer.address);
  console.log("* Account balance:", (await deployer.getBalance()).toString());
  console.log("* Multilogic address:", multiLogicAddress);
  console.log("* Storage address:", storageAddress);
  console.log("* Aggregator address:", aggregatorAddress);
  console.log("* Multilogic force init:", multiLogicForceInit);
  console.log("* Storage force init:", storageForceInit);
  console.log("* Multilogic force upgrade:", multiLogicUpgrade);
  console.log("* Storage force upgrade:", storageUpgrade);

  const multiLogicFactory = await ethers.getContractFactory("MultiLogic");
  const storageFactory = await ethers.getContractFactory("StorageV3");

  // ---
  console.log("- Contracts initial deploy -");
  // ---
  if (!storageAddress) {
    console.log("- Deploy Storage -");
    storage = await upgrades.deployProxy(storageFactory, [], {
      initializer: "initialize",
    });
    await storage.deployed();

    storageImpl = await upgrades.erc1967.getImplementationAddress(
      storage.address
    );
    console.log("Storage Proxy:", storage.address);
    console.log("Storage Implementation:", storageImpl);
    console.log(
      "Storage ProxyAdmin:",
      await upgrades.erc1967.getAdminAddress(storage.address)
    );
    // TODO: add saving to the Vault
  } else {
    storage = StorageV3__factory.connect(storageAddress, deployer);
  }

  if (!multiLogicAddress) {
    console.log("- Deploy MultiLogic -");
    multiLogic = await upgrades.deployProxy(multiLogicFactory, [], {
      initializer: "initialize",
    });
    await multiLogic.deployed();

    multiLogicImpl = await upgrades.erc1967.getImplementationAddress(
      multiLogic.address
    );
    console.log("MultiLogic Proxy:", multiLogic.address);
    console.log("MultiLogic Implementation:", multiLogicImpl);
    // TODO: add saving to the Vault
  } else {
    multiLogic = MultiLogic__factory.connect(multiLogicAddress, deployer);
  }

  if (!aggregatorAddress) {
    console.log("- Deploy Aggregator -");
    const Aggregator = await ethers.getContractFactory("AggregatorN3");
    let aggregator = await Aggregator.deploy();
    aggregatorImpl = aggregator.address;
    await aggregator.deployed();
    console.log("Aggregator address:", aggregatorImpl);
    // TODO: add saving to the Vault
  }

  // ---
  console.log("- First initialization after deployment -");
  // ---
  if (storageInit) {
    console.log("- Storage Init -");
    tx = await storage.connect(deployer).setBLID(blidAddress);
    await tx.wait(1);

    tx = await storage.connect(deployer).setMultiLogicProxy(multiLogic.address);
    await tx.wait(1);

    tx = await storage.connect(deployer).setBoostingAddress(boostingAddress);
    await tx.wait(1);

    if (addresses.Token.BUSD) {
      await storage
        .connect(deployer)
        .addToken(addresses.Token.BUSD.Underlying, addresses.CHAINLINK.BUSD);
      await tx.wait(1);
    }

    if (addresses.Token.USDT) {
      tx = await storage
        .connect(deployer)
        .addToken(addresses.Token.USDT.Underlying, addresses.CHAINLINK.USDT);
      await tx.wait(1);
    }

    if (addresses.Token.USDC) {
      tx = await storage
        .connect(deployer)
        .addToken(addresses.Token.USDC.Underlying, addresses.CHAINLINK.USDC);
      await tx.wait(1);
    }

    if (addresses.Token.DAI) {
      tx = await storage
        .connect(deployer)
        .addToken(addresses.Token.DAI.Underlying, addresses.CHAINLINK.DAI);
      await tx.wait(1);
    }
  }

  if (multiLogicInit) {
    console.log("- Multilogic Init -");
    tx = await multiLogic.connect(deployer).setStorage(storage.address);
    await tx.wait(1);

    if (storageInit) {
      tx = await storage
        .connect(deployer)
        .setMultiLogicProxy(multiLogic.address);
      await tx.wait(1);
    }
  }

  // ---
  console.log("- Upgrade -");
  // ---
  if (multiLogicUpgrade) {
    const upgradedLogic = await upgrades.upgradeProxy(
      multiLogicAddress,
      multiLogicFactory
    );
    await upgradedLogic.deployed();

    multiLogicImpl = await upgrades.erc1967.getImplementationAddress(
      upgradedLogic.address
    );
    console.log("New MultiLogic Implementation:", multiLogicImpl);
  }

  if (storageUpgrade) {
    const upgradedStorage = await upgrades.upgradeProxy(
      storageAddress,
      storageFactory
    );
    await upgradedStorage.deployed();

    storageImpl = await upgrades.erc1967.getImplementationAddress(
      upgradedStorage.address
    );
    console.log("New Storage Implementation:", storageImpl);
  }

  // ---
  console.log("- Set version -");
  // ---
  if (multiLogicInit || multiLogicUpgrade) {
    await multiLogic
      .connect(deployer)
      .upgradeVersion(version, contractEnv + " " + purpose);
  }
  if (storageInit || storageUpgrade) {
    await storage
      .connect(deployer)
      .upgradeVersion(version, contractEnv + " " + purpose);
  }

  // ---
  console.log("- Verify contracts -");
  // ---
  console.log("Sleeping for 1 seconds before verification...");
  await sleep(1000);
  if (storageInit || storageUpgrade) {
    console.log("- Verify Storage -");
    await verify(storage.address);
  }
  if (multiLogicInit || multiLogicUpgrade) {
    console.log("- Verify MultiLogic -");
    await verify(multiLogic.address);
  }
  if (!aggregatorAddress) {
    console.log("- Verify Aggregator -");
    await verify(aggregatorImpl);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
