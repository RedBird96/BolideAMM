import {ethers, upgrades, network} from "hardhat";
import {sleep, verify} from "../utils/helpers";
import {multisig, secondConfirmTransaction, executeBatch} from "../utils/multisig";
import {
  StorageV21__factory,
} from "../typechain-types";
import {abi as StorageAbi} from "../artifacts/contracts/StorageV21.sol/StorageV21.json";


async function main() {

  const provider = new ethers.providers.JsonRpcProvider(
    // @ts-ignore
    network.config.url,{name: network.config.addressesSet, 
      chainId: network.config.chainId!}
  );

  const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const signer2 = new ethers.Wallet(process.env.PRIVATE_KEY_1!, provider);

  const [deployer] = await ethers.getSigners();

  // Deploy Logic

  const proxyAddress = "0xCE5ee44d57E19d8E4c6B9B1652042c9e8e91aa2c";
  const implementAddress = "0x36a5Ae33EE9E38eFef9cE72097031aB94d18A47e";
  const stargateRouter = "0x817436a076060D158204d955E5403b6Ed0A5fac0";
  // await verify(proxyAddress);
  // await verify(implementAddress);
  const Storage = await ethers.getContractFactory("CrossChainDepositor");
  // const storage = StorageV21__factory.connect(proxyAddress, deployer);
  // const storage = await upgrades.upgradeProxy(proxyAddress, Storage);

  const storage = await upgrades.deployProxy(Storage, 
    [stargateRouter],
    {
      kind: "uups",
      initializer: "__CrossChainDepositor_init",
  });

  await storage.deployed();
  const StorageImpl = await upgrades.erc1967.getImplementationAddress(
    storage.address
  );

  console.log('Deploy proxy success:', storage.address);
  console.log('Deploy implement success:', StorageImpl);

  await verify(storage.address);
  await verify(StorageImpl);

  // const MultiLogic = await ethers.getContractFactory("MultiLogic");
  // const multilogic = await upgrades.deployProxy(MultiLogic, 
  //   [],
  //   {
  //     kind: "uups",
  //     initializer: "__MultiLogicProxy_init",
  // });

  // await multilogic.deployed();
  // const MultiLogicImpl = await upgrades.erc1967.getImplementationAddress(
  //   multilogic.address
  // );

  // console.log('Deploy proxy success:', multilogic.address);
  // console.log('Deploy implement success:', MultiLogicImpl);

  // await verify(multilogic.address);
  // await verify(MultiLogicImpl);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });