import {ethers, upgrades, run, network} from "hardhat";
import {sleep, verify} from "../utils/helpers";
import dotenv from "dotenv";
import {
  multisig,
  secondConfirmTransaction,
  executeBatch,
} from "../utils/multisig";
import {
  Logic__factory,
  StorageV3__factory,
  MultiLogic__factory,
  LogicV2__factory,
} from "../typechain-types";
import {abi as StorageAbi} from "../artifacts/contracts/StorageV21.sol/StorageV21.json";
import {abi as LogicAbi} from "../artifacts/contracts/Logic.sol/Logic.json";
import "@openzeppelin/hardhat-upgrades";
import yn from "yn";

dotenv.config();

async function main() {
  const useMultiSig = yn(process.env.UPGRADE_USE_MULTISIG);
  const proxyAddress = process.env.UPGRADE_PROXY_ADDRESS!;
  const forceImport = yn(process.env.UPGRADE_FORCEIMPORT);

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("use MultiSig:", useMultiSig);
  console.log("Proxy Address:", proxyAddress);
  console.log("ForceImport:", forceImport);

  ////////////////////// Admin must be check this settings before run the script////////////////////////

  if (useMultiSig) {
    const provider = new ethers.providers.JsonRpcProvider(
      // @ts-ignore
      network.config.url,
      // @ts-ignore
      {name: network.config.addressesSet, chainId: network.config.chainId!}
    );

    const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    const signer2 = new ethers.Wallet(process.env.PRIVATE_KEY_1!, provider);

    const Contract = await ethers.getContractFactory("LogicV2");
    const ContractImp = LogicV2__factory.connect(proxyAddress, deployer);
    const ContractABI = LogicAbi;

    await upgrades.admin.transferProxyAdminOwnership(
      process.env.GNOSIS_SAFE_ADDRESS!
    );
    const contractImpl = await upgrades.prepareUpgrade(proxyAddress, Contract);

    console.log("Proxy:", proxyAddress);
    console.log("Implementation:", contractImpl);
    await multisig(
      ContractImp,
      "upgradeTo",
      [contractImpl],
      JSON.stringify(ContractABI),
      signer
    );
    secondConfirmTransaction(signer2);
    executeBatch(signer);

    console.log(">>>>>>>>>>>> Verification >>>>>>>>>>>>");
    await verify(contractImpl);
  } else {
    const upgradeContractOld = process.env.UPGRADE_CONTRACT_OLD!;
    const upgradeContractNew = process.env.UPGRADE_CONTRACT_NEW!;

    // ---
    console.log("- Validation -");
    // ---

    if (!proxyAddress) {
      console.warn("Please set the UPGRADE_PROXY_ADDRESS");
      return;
    }

    if (!upgradeContractNew) {
      console.warn("Please set the UPGRADE_CONTRACT_NEW name");
      return;
    }

    if (forceImport && !upgradeContractOld) {
      console.warn("Please set the UPGRADE_CONTRACT_OLD name");
      return;
    }

    const ContractNew = await ethers.getContractFactory(upgradeContractNew);

    if (forceImport) {
      // ---
      console.log("- forceimport -");
      // ---
      const ContractOld = await ethers.getContractFactory(upgradeContractOld);
      await upgrades.forceImport(proxyAddress, ContractOld);
    }

    // ---
    console.log("- Upgrade -");
    // ---
    const contract = await upgrades.upgradeProxy(proxyAddress, ContractNew);
    await contract.deployed();

    const contractImpl = await upgrades.erc1967.getImplementationAddress(
      contract.address
    );

    console.log("Proxy:", contract.address);
    console.log("Implementation:", contractImpl);
    console.log(
      "ProxyAdmin:",
      await upgrades.erc1967.getAdminAddress(contract.address)
    );

    // ---
    console.log("- Verify contract -");
    // ---
    console.log("Sleeping for 1 seconds before verification...");
    await sleep(1000);
    console.log(">>>>>>>>>>>> Verification >>>>>>>>>>>>");
    await verify(contract.address);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
