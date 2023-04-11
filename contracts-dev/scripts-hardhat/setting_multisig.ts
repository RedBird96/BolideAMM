import {ethers, network} from "hardhat";
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
import {
  multisig,
  secondConfirmTransaction,
  executeBatch
} from "../utils/multisig";
import {
  abi as StorageAbi
} from "../artifacts/contracts/StorageV21.sol/StorageV21.json";
import {
  abi as LogicAbi
} from "../artifacts/contracts/Logic.sol/Logic.json";

dotenv.config();

async function main() {

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
    multiLogic;

  const setConfig = {
    changeOwner: true,
    setInitial: {
      storage: false,
      logic: false
    }
  };

  const provider = new ethers.providers.JsonRpcProvider(
    // @ts-ignore
    network.config.url,{name: network.config.addressesSet, 
      chainId: network.config.chainId!}
  );

  if (!process.env.GNOSIS_SAFE_ADDRESS) {
    console.warn("Please set GNOSIS_SAFE_ADDRESS for multisig process");
    return;
  }

  if (!process.env.PRIVATE_KEY) {
    console.warn("Please set PRIVATE_KEY for multisig process");
    return;
  }

  if (!process.env.PRIVATE_KEY_1 && 
      (setConfig.setInitial.storage ||
      setConfig.setInitial.logic)) {
    console.warn("Please set second PRIVATE_KEY for multisig process");
    return;
  }

  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const signer2 = new ethers.Wallet(process.env.PRIVATE_KEY_1!, provider);

  const [deployer] = await ethers.getSigners();
  
  storage = StorageV3__factory.connect(storageAddress, deployer);
  multiLogic = MultiLogic__factory.connect(multiLogicAddress, deployer);
  lblLogic = Logic__factory.connect(lblLogicAddress, deployer);
  lblStrategy = LendBorrowLendStrategy__factory.connect(lblStrategyAddress, deployer);
  lbfLogic = Logic__factory.connect(lbfLogicAddress, deployer);
  lbfStrategy = LendBorrowLendStrategy__factory.connect(lbfStrategyAddress, deployer);

  if (setConfig.changeOwner) {
    storage.transferOwnership(process.env.GNOSIS_SAFE_ADDRESS!)
    multiLogic.transferOwnership(process.env.GNOSIS_SAFE_ADDRESS!)
    lblLogic.transferOwnership(process.env.GNOSIS_SAFE_ADDRESS!)
    lbfLogic.transferOwnership(process.env.GNOSIS_SAFE_ADDRESS!)
  }

  if (setConfig.setInitial.storage) {
    await multisig(storage, "setBLID", [process.env.BLIDADDRESS!], JSON.stringify(StorageAbi), signer);
    await multisig(storage, "setMultiLogicProxy", [multiLogic.address], JSON.stringify(StorageAbi), signer);
    
  }

  if (setConfig.setInitial.logic) {
    await multisig(lblLogic, "setMultiLogicProxy", [multiLogic.address], JSON.stringify(StorageAbi), signer);
    await multisig(lblLogic, "setBLID", [process.env.BLIDADDRESS!], JSON.stringify(LogicAbi), signer);
    await multisig(lblLogic, "setAdmin", [lbfStrategy.address], JSON.stringify(LogicAbi), signer);

    await multisig(lbfLogic, "setMultiLogicProxy", [multiLogic.address], JSON.stringify(StorageAbi), signer);
    await multisig(lbfLogic, "setBLID", [process.env.BLIDADDRESS!], JSON.stringify(LogicAbi), signer);
    await multisig(lbfLogic, "setAdmin", [lbfStrategy.address], JSON.stringify(LogicAbi), signer);
  }

  if (setConfig.setInitial.storage || setConfig.setInitial.logic) {
    secondConfirmTransaction(signer2);
    executeBatch(signer);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
