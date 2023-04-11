import {ethers, upgrades, network} from "hardhat";
import {sleep, verify} from "../utils/helpers";
import dotenv from "dotenv";
import "@openzeppelin/hardhat-upgrades";
import {ADDRESS_COLLECTION, PLATFORM} from "../data/addresses.json";
import {StorageV2__factory, LogicV1__factory} from "../typechain-types";

dotenv.config();

async function main() {
  let tx, logic, storage;
  // @ts-ignore
  const platform = PLATFORM[network.name];
  const blidAddress = platform.blid;
  const expenseAddress = platform.expenses;
  // @ts-ignore
  const addresses = ADDRESS_COLLECTION[network.config.addressesSet];

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const LogicV1F = await ethers.getContractFactory("LogicV1");
  const StorageV2F = await ethers.getContractFactory("StorageV2");

  logic = await LogicV1F.deploy(
    expenseAddress,
    addresses.VenusController,
    addresses.PancakeRouter,
    addresses.ApeswapRouter,
    addresses.BiswapRouter,
    addresses.PancakeMasterV2,
    addresses.ApeswapMaster,
    addresses.BiswapMaster
  );
  await logic.deployed();
  // logic = LogicV1__factory.connect(
  //   "0x996bD73d8b19D8A22692dfaf373780d604888129",
  //   deployer
  // );
  console.log("Logic:", logic.address);

  storage = await upgrades.deployProxy(StorageV2F, [logic.address], {
    initializer: "initialize",
  });
  await storage.deployed();

  // storage = StorageV2__factory.connect(
  //   "0xafa5775549ef2E15F696Ef8Be02D21a697600F75",
  //   deployer
  // );
  console.log("Storage Proxy:", storage.address);

  tx = await logic.setStorage(storage.address);
  await tx.wait(1);
  tx = await storage.setBLID(blidAddress);
  await tx.wait(1);
  tx = await logic.setBLID(blidAddress);
  await tx.wait(1);

  tx = await logic
    .connect(deployer)
    .enterMarkets([
      addresses.Token.XRP.Venus,
      addresses.Token.SXP.Venus,
      addresses.Token.BCH.Venus,
      addresses.Token.LINK.Venus,
      addresses.Token.DOT.Venus,
      addresses.Token.LTC.Venus,
      addresses.Token.FIL.Venus,
      addresses.Token.MATIC.Venus,
    ]);
  await tx.wait(1);

  //******** Multi Vault(Storage) *****************/
  tx = await storage
    .connect(deployer)
    .addToken(addresses.Token.XRP.Underlying, addresses.CHAINLINK.XRP);
  await tx.wait(1);
  tx = await storage
    .connect(deployer)
    .addToken(addresses.Token.SXP.Underlying, addresses.CHAINLINK.SXP);
  await tx.wait(1);
  tx = await storage
    .connect(deployer)
    .addToken(addresses.Token.BCH.Underlying, addresses.CHAINLINK.BCH);
  await tx.wait(1);
  tx = await storage
    .connect(deployer)
    .addToken(addresses.Token.LINK.Underlying, addresses.CHAINLINK.LINK);
  await tx.wait(1);
  tx = await storage
    .connect(deployer)
    .addToken(addresses.Token.DOT.Underlying, addresses.CHAINLINK.DOT);
  await tx.wait(1);
  tx = await storage
    .connect(deployer)
    .addToken(addresses.Token.LTC.Underlying, addresses.CHAINLINK.LTC);
  await tx.wait(1);
  tx = await storage
    .connect(deployer)
    .addToken(addresses.Token.FIL.Underlying, addresses.CHAINLINK.FIL);
  await tx.wait(1);
  tx = await storage
    .connect(deployer)
    .addToken(addresses.Token.MATIC.Underlying, addresses.CHAINLINK.MATIC);
  await tx.wait(1);

  tx = await logic.approveTokenForSwap(addresses.SWAP.Ape.XRP_BNB.LP);
  await tx.wait(1);
  tx = await logic.approveTokenForSwap(addresses.Token.XVS.Underlying); // XVS
  await tx.wait(1);
  tx = await logic.approveTokenForSwap(addresses.Token.BANANA.Underlying); // BANANA
  await tx.wait(1);
  tx = await logic.approveTokenForSwap(addresses.Token.CAKE.Underlying); // CAKE
  await tx.wait(1);
  tx = await logic.approveTokenForSwap(addresses.Token.BSW.Underlying); // BSW
  await tx.wait(1);
  tx = await logic.approveTokenForSwap(blidAddress); // BLID
  await tx.wait(1);

  tx = await logic.addVTokens(
    "0x0000000000000000000000000000000000000000",
    addresses.Token.BNB.Venus
  );
  await tx.wait(1);

  console.log("Sleeping for 60 seconds before verification...");
  await sleep(1000);
  console.log(">>>>>>>>>>>> Verification >>>>>>>>>>>>");

  await verify(storage.address);
  await verify(logic.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
