import {ethers, network, upgrades} from "hardhat";
import {sleep, verify} from "../utils/helpers";
import dotenv from "dotenv";
import "@openzeppelin/hardhat-upgrades";
import {STARGATE_COLLECTION} from "../data/addresses.json";
import {CrossChainDepositor} from "../typechain-types";

async function main() {
  let crossChainDepositor, tx;
  let crossChainDepositorImpl = "";

  dotenv.config();

  console.log("- CrossChain ETH migration -");

  // @ts-ignore
  const addresses = STARGATE_COLLECTION[network.config.addressesSet];
  const crossChainDepositorAddress = process.env.CROSSCHAIN_DEPOSITOR_ADDRESS!;
  const accumulatedDepositorAddress =
    process.env.ACCUMULATED_DEPOSITOR_ADDRESS!;
  const ethStargateRouterAddress = addresses.StargateRouter;

  // ---
  console.log("- Validation -");
  // ---

  if (!ethStargateRouterAddress) {
    console.warn("Please set the StargateRouter address");
    return;
  }

  if (!accumulatedDepositorAddress) {
    console.warn("Please set the AccumulatedDepositor address");
    return;
  }

  if (network.name.includes("bsc")) {
    console.warn("Please not to choose network as `bsc` nor `bscTestnet`");
    return;
  }

  const [deployer] = await ethers.getSigners();

  console.log("* Account address:", deployer.address);
  console.log("* Account balance:", (await deployer.getBalance()).toString());
  console.log("* StargateRouter address:", ethStargateRouterAddress);
  console.log("* AccumulatedDepositor address:", accumulatedDepositorAddress);

  const crossChainDepositorFactory = await ethers.getContractFactory(
    "CrossChainDepositor"
  );

  // ---
  console.log("- Contracts initial deploy -");
  // ---
  if (!crossChainDepositorAddress) {
    console.log("- Deploy CrossChainDepositor -");
    crossChainDepositor = (await upgrades.deployProxy(
      crossChainDepositorFactory,
      [ethStargateRouterAddress],
      {
        initializer: "__CrossChainDepositor_init",
      }
    )) as CrossChainDepositor;

    await crossChainDepositor.deployed();

    crossChainDepositorImpl = await upgrades.erc1967.getImplementationAddress(
      crossChainDepositor.address
    );
    console.log("CrossChainDepositor Proxy:", crossChainDepositor.address);
    console.log("CrossChainDepositor Implementation:", crossChainDepositorImpl);
  } else {
    console.log("- Upgrade CrossChainDepositor -");
    crossChainDepositor = await upgrades.upgradeProxy(
      crossChainDepositorAddress,
      crossChainDepositorFactory
    );
    await crossChainDepositor.deployed();
    crossChainDepositorImpl = await upgrades.erc1967.getImplementationAddress(
      crossChainDepositor.address
    );
    console.log(
      "New CrossChainDepositor Implementation:",
      crossChainDepositorImpl
    );
  }

  // ---
  console.log("- First initialization after deployment -");
  // ---
  if (!crossChainDepositorAddress) {
    console.log("- Set AccumulatedDepositor -");

    tx = await crossChainDepositor
      .connect(deployer)
      .setAccumulatedDepositor(accumulatedDepositorAddress);
    await tx.wait(1);

    console.log("- Add Stargate tokens -");

    if (addresses.token.hasOwnProperty("USDT")) {
      tx = await crossChainDepositor
        .connect(deployer)
        .addStargateToken(
          addresses.token.USDT.address,
          addresses.token.USDT.poolId
        );
      await tx.wait(1);
    }

    if (addresses.token.hasOwnProperty("USDC")) {
      tx = await crossChainDepositor
        .connect(deployer)
        .addStargateToken(
          addresses.token.USDC.address,
          addresses.token.USDC.poolId
        );
      await tx.wait(1);
    }
  }

  // ---
  console.log("- Verify contracts -");
  // ---
  console.log("Sleeping for 1 seconds before verification...");
  await sleep(1000);

  console.log("- Verify CrossChainDepositor -");
  await verify(crossChainDepositor.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
