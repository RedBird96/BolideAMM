import {ethers, network, upgrades} from "hardhat";
import {sleep, verify} from "../utils/helpers";
import dotenv from "dotenv";
import "@openzeppelin/hardhat-upgrades";
import {STARGATE_COLLECTION} from "../data/addresses.json";
import {AccumulatedDepositor, StorageV3__factory} from "../typechain-types";

async function main() {
  let accumulatedDepositor, storage, tx;
  let accumulatedDepositorImpl = "";

  dotenv.config();

  console.log("- CrossChain BSC migration with Storage -");

  // @ts-ignore
  const addresses = STARGATE_COLLECTION[network.config.addressesSet];
  const accumulatedDepositorAddress =
    process.env.ACCUMULATED_DEPOSITOR_ADDRESS!;
  const bscStargateRouterAddress = addresses.StargateRouter;
  const storageAddress = process.env.STORAGE_PROXY_ADDRESS!;
  const storageV2Address = process.env.STORAGEV2_PROXY_ADDRESS!;

  // ---
  console.log("- Validation -");
  // ---

  if (!bscStargateRouterAddress) {
    console.warn("Please set the StargateRouter address");
    return;
  }

  if (!storageAddress && !storageV2Address) {
    console.warn("Please set the Storage address");
    return;
  }

  if (storageAddress && storageV2Address) {
    console.warn("You can set only 1 of StorageV2 or StorageV3 address");
    return;
  }

  if (!network.name.includes("bsc")) {
    console.warn("Please choose network as `bsc` or `bscTestnet`");
    return;
  }

  const [deployer] = await ethers.getSigners();

  console.log("* Account address:", deployer.address);
  console.log("* Account balance:", (await deployer.getBalance()).toString());
  console.log("* StargateRouter address:", bscStargateRouterAddress);
  console.log("* StorageV2 address:", storageV2Address);
  console.log("* StorageV3 address:", storageAddress);

  const accumulatedDepositorFactory = await ethers.getContractFactory(
    "AccumulatedDepositor"
  );

  // ---
  console.log("- Contracts initial deploy -");
  // ---

  if (!accumulatedDepositorAddress) {
    console.log("- Deploy AccumulatedDepositor -");
    accumulatedDepositor = (await upgrades.deployProxy(
      accumulatedDepositorFactory,
      [bscStargateRouterAddress],
      {
        initializer: "__AccumulatedDepositor_init",
      }
    )) as AccumulatedDepositor;

    await accumulatedDepositor.deployed();

    accumulatedDepositorImpl = await upgrades.erc1967.getImplementationAddress(
      accumulatedDepositor.address
    );
    console.log("AccumulatedDepositor Proxy:", accumulatedDepositor.address);
    console.log(
      "AccumulatedDepositor Implementation:",
      accumulatedDepositorImpl
    );
  } else {
    console.log("- Upgrade AccumulatedDepositor -");
    accumulatedDepositor = await upgrades.upgradeProxy(
      accumulatedDepositorAddress,
      accumulatedDepositorFactory
    );
    await accumulatedDepositor.deployed();

    accumulatedDepositorImpl = await upgrades.erc1967.getImplementationAddress(
      accumulatedDepositor.address
    );
    console.log(
      "New AccumulatedDepositor Implementation:",
      accumulatedDepositorImpl
    );
  }

  if (storageV2Address) {
    console.log("- Upgrade StorgeV2 to StorageV21 -");
    const storageFactoryNew = await ethers.getContractFactory("StorageV21");
    storage = await upgrades.upgradeProxy(storageAddress, storageFactoryNew);
    await storage.deployed();

    let storageImpl = await upgrades.erc1967.getImplementationAddress(
      storage.address
    );
    console.log("New Strategy Implementation:", storageImpl);
  } else {
    storage = StorageV3__factory.connect(storageAddress, deployer);
  }

  // ---
  console.log("- First initialization after deployment -");
  // ---
  if (!accumulatedDepositorAddress) {
    console.log("- Set Storage -");

    tx = await accumulatedDepositor
      .connect(deployer)
      .setStorage(storage.address);
    await tx.wait(1);

    tx = await storage.setAccumulatedDepositor(accumulatedDepositor.address);
    await tx.wait(1);

    console.log("- Add Stargate tokens -");
    if (addresses.token.USDT) {
      tx = await accumulatedDepositor
        .connect(deployer)
        .addStargateToken(addresses.token.USDT.address);
      await tx.wait(1);
    }

    if (addresses.token.BUSD) {
      tx = await accumulatedDepositor
        .connect(deployer)
        .addStargateToken(addresses.token.BUSD.address);
      await tx.wait(1);
    }
  }

  // ---
  console.log("- Verify contracts -");
  // ---
  console.log("Sleeping for 1 seconds before verification...");
  await sleep(1000);

  if (storageV2Address) {
    console.log("- Verify StorageV21 -");
    await verify(storage.address);
  }

  console.log("- Verify AccumulatedDepositor -");
  await verify(accumulatedDepositor.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
