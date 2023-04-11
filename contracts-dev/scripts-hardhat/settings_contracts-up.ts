import {ethers, upgrades, network} from "hardhat";
import dotenv from "dotenv";
import {ADDRESS_COLLECTION, PLATFORM} from "../data/addresses.json";
import "@openzeppelin/hardhat-upgrades";
import {MultiLogic__factory, StorageV3__factory} from "../typechain-types";
import yn from "yn";

async function main() {
  let tx, multiLogic, storage;
  dotenv.config();

  console.log("- Connect exist strategies to multilogic -");

  // @ts-ignore is required
  const addresses = ADDRESS_COLLECTION[network.config.addressesSet];

  const lblLogicAddress = process.env.LBL_LOGIC_PROXY_ADDRESS!;
  const lblStrategyAddress = process.env.LBL_STRATEGY_PROXY_ADDRESS!;

  const lbfLogicAddress = process.env.LBF_LOGIC_PROXY_ADDRESS!;
  const lbfStrategyAddress = process.env.LBF_STRATEGY_PROXY_ADDRESS!;

  const multiLogicAddress = process.env.MULTILOGIC_PROXY_ADDRESS!;
  const multiLogicSettingUp = yn(process.env.MULTILOGIC_SETTING_UP, {
    default: true,
  });

  const storageAddress = process.env.STORAGE_PROXY_ADDRESS!;
  const storageSettingUp = yn(process.env.STORAGE_SETTING_UP, {
    default: true,
  });
  const storageLeaveLimit = process.env.STORAGE_LEAVE_LIMIT!;
  const storageLeavePercentage = process.env.STORAGE_LEAVE_PERCENTAGE!;
  const storageLeaveFixed = process.env.STORAGE_LEAVE_FIXED!;

  // ---
  console.log("- Validation -");
  // ---

  if (!process.env.PRIVATE_KEY) {
    console.warn("Please set PRIVATE_KEY for deploy process");
    return;
  }

  if (!multiLogicAddress) {
    console.warn("Please set MULTILOGIC_PROXY_ADDRESS for deploy process");
    return;
  }

  if (storageSettingUp && !storageAddress) {
    console.warn("Please set STORAGE_PROXY_ADDRESS for deploy process");
    return;
  }

  if (storageSettingUp && !storageLeaveLimit) {
    console.warn("Please set STORAGE_LEAVE_LIMIT for deploy process");
    return;
  }

  if (storageSettingUp && !storageLeavePercentage) {
    console.warn("Please set STORAGE_LEAVE_PERCENTAGE for deploy process");
    return;
  }

  if (storageSettingUp && !storageLeaveFixed) {
    console.warn("Please set STORAGE_LEAVE_FIXED for deploy process");
    return;
  }

  const [deployer] = await ethers.getSigners();

  console.log("* Account address:", deployer.address);
  console.log("* Account balance:", (await deployer.getBalance()).toString());
  console.log("* Multilogic address:", multiLogicAddress);
  console.log("* Storage address:", storageAddress);
  console.log("* LBL Logic address:", lblLogicAddress);
  console.log("* LBL Strategy address:", lblStrategyAddress);
  console.log("* LBF Logic address:", lbfLogicAddress);
  console.log("* LBF Strategy address:", lbfStrategyAddress);
  console.log("* Storage leaveLimit:", storageLeaveLimit);
  console.log("* Storage leavePercentage:", storageLeavePercentage);
  console.log("* Storage leaveFixed:", storageLeaveFixed);

  multiLogic = MultiLogic__factory.connect(multiLogicAddress, deployer);
  storage = StorageV3__factory.connect(storageAddress, deployer);

  const strategiesName = ["LBF", "LBL"];
  let strategies = [];
  if (lbfLogicAddress && lbfStrategyAddress) {
    strategies.push({
      logicContract: lbfLogicAddress,
      strategyContract: lbfStrategyAddress,
    });
  }
  if (lblLogicAddress && lblStrategyAddress) {
    strategies.push({
      logicContract: lblLogicAddress,
      strategyContract: lblStrategyAddress,
    });
  }
  if (strategies) {
    console.log("- Connect Strategies -");
    tx = await multiLogic
      .connect(deployer)
      .initStrategies(strategiesName, strategies);
    await tx.wait(1);
  }

  console.log("- Setting Up -");
  if (multiLogicSettingUp) {
    if (addresses.Token.BUSD) {
      tx = await multiLogic
        .connect(deployer)
        .setPercentages(addresses.Token.BUSD.Underlying, [5000, 5000]);
      await tx.wait(1);
    }

    if (addresses.Token.USDT) {
      tx = await multiLogic
        .connect(deployer)
        .setPercentages(addresses.Token.USDT.Underlying, [5000, 5000]);
      await tx.wait(1);
    }

    if (addresses.Token.USDC) {
      tx = await multiLogic
        .connect(deployer)
        .setPercentages(addresses.Token.USDC.Underlying, [5000, 5000]);
      await tx.wait(1);
    }

    if (addresses.Token.DAI) {
      tx = await multiLogic
        .connect(deployer)
        .setPercentages(addresses.Token.DAI.Underlying, [10000, 0]);
      await tx.wait(1);
    }
  }

  if (storageSettingUp) {
    tx = await storage
      .connect(deployer)
      .setLeaveTokenPolicy(
        storageLeaveLimit,
        storageLeavePercentage,
        storageLeaveFixed
      );
    await tx.wait(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
