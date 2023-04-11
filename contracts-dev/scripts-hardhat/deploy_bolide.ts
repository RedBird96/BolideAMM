import {ethers} from "hardhat";
import {sleep, verify} from "../utils/helpers";

async function main() {
  const [deployer] = await ethers.getSigners();

  // Deploy Logic

  // ---
  console.log("- Deploy bolide -");
  // ---

  const Bolide = await ethers.getContractFactory("Bolide");
  const bolide = await Bolide.deploy("1000000000000000000000000");
  console.log("Deploy bolide success:", bolide.address);

  // ---
  console.log("- Verify bolide -");
  // ---
  console.log("Sleeping for 1 seconds before verification...");
  await sleep(1000);
  await verify(bolide.address, ["1000000000000000000000000"]);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
