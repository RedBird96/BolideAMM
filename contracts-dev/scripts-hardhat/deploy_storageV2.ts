import {ethers, upgrades, network} from "hardhat";
import {sleep, verify} from "../utils/helpers";
import {ADDRESS_COLLECTION} from "../data/addresses.json";
import {multisig, secondConfirmTransaction, executeBatch} from "../utils/multisig";
import {
  Logic__factory
} from "../typechain-types/factories/contracts/v1/LogicV2.sol";
import {abi as StorageAbi} from "../artifacts/contracts/StorageV21.sol/StorageV21.json";


async function main() {

  const ADDRESSES = ADDRESS_COLLECTION.bsc;

  let logic,
    lblStrategy,
    lbfLogic,
    lbfStrategy,
    storage,
    aggregator,
    tx,
    multiLogic;

  // const Logic = await ethers.getContractFactory("contracts/v1/LogicV2.sol:Logic");
  // lbfLogic = await Logic.deploy(
  //   "0x073F7160BcE57B28A11a0eb28D15E79Aa5B24550",
  //   "0x073F7160BcE57B28A11a0eb28D15E79Aa5B24550",
  //   "0x073F7160BcE57B28A11a0eb28D15E79Aa5B24550",
  //   "0x073F7160BcE57B28A11a0eb28D15E79Aa5B24550",
  //   "0x073F7160BcE57B28A11a0eb28D15E79Aa5B24550",
  //   "0x073F7160BcE57B28A11a0eb28D15E79Aa5B24550",
  //   "0x073F7160BcE57B28A11a0eb28D15E79Aa5B24550",
  //   "0x073F7160BcE57B28A11a0eb28D15E79Aa5B24550"
  // );
  // await lbfLogic.deployed();
  // await verify(lbfLogic.address);
  // console.log('address', lbfLogic.address);

  // const Logic = await ethers.getContractFactory("contracts/v1/LogicV2.sol:LogicV2");
  // logic = await upgrades.deployProxy(
  //   Logic,
  //   [
  //     process.env.EXPENSEADDRESS,
  //     ADDRESSES.VenusController,
  //     ADDRESSES.PancakeRouter,
  //     ADDRESSES.ApeswapRouter,
  //     ADDRESSES.BiswapRouter,
  //     ADDRESSES.PancakeMasterV2,
  //     ADDRESSES.ApeswapMaster,
  //     ADDRESSES.BiswapMaster,
  //   ],
  //   {
  //     kind: "uups",
  //     initializer: "__Logic_init",
  //   }
  // );
  // await logic.deployed();

  // const logicImpl = await upgrades.erc1967.getImplementationAddress(
  //   logic.address
  // );
  // console.log("Logic Proxy:", logic.address);
  // console.log("Logic Implementation:", logicImpl);
  // console.log(
  //   "Logic ProxyAdmin:",
  //   await upgrades.erc1967.getAdminAddress(logic.address)
  // );

  // console.log(">>>>>>>>>>>> Verification >>>>>>>>>>>>");

  // await verify(logic.address);
  // await verify(logicImpl);
  
  const Storage = await ethers.getContractFactory("StrategyHelper");
    storage = await upgrades.deployProxy(Storage, [], {
      initializer: "__StrategyHelper_init",
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
  
  console.log(">>>>>>>>>>>> Verification >>>>>>>>>>>>");

  await verify(storage.address);
  await verify(storageImpl);
        
  // const MultiLogic = await ethers.getContractFactory("MultiLogic");
  // multiLogic = await upgrades.deployProxy(MultiLogic, [], {
  //     initializer: "__MultiLogicProxy_init",
  //   });
  // await multiLogic.deployed();

  // const multiLogicImpl = await upgrades.erc1967.getImplementationAddress(
  //   multiLogic.address
  // );
  // console.log("MultiLogic Proxy:", multiLogic.address);
  // console.log("MultiLogic Implementation:", multiLogicImpl);
  // console.log(
  //   "MultiLogic ProxyAdmin:",
  //   await upgrades.erc1967.getAdminAddress(multiLogic.address)
  // );
  
  // console.log(">>>>>>>>>>>> Verification >>>>>>>>>>>>");

  // await verify(multiLogic.address);
  // await verify(multiLogicImpl);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });