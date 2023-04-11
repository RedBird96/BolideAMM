import dotenv from "dotenv";
import "@nomiclabs/hardhat-web3";
import "@nomiclabs/hardhat-ethers";
import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-contract-sizer";
import "@typechain/hardhat";
import "@nomicfoundation/hardhat-toolbox";
import "./tasks/full_clean";

dotenv.config();

const ethers = require("ethers");

const developmentMnemonic =
  "test test test test test test test test test test test junk";

const providerUrl = process.env.MAINNET_BSC_PROVIDER_URL;

if (!providerUrl) {
  console.error(
    "Missing JSON RPC provider URL as environment variable `MAINNET_BSC_PROVIDER_URL`\n"
  );
  process.exit(1);
}

function getPrivateKeysFromMnemonic(
  mnemonic: string,
  numberOfPrivateKeys = 20
) {
  const result = [];
  for (let i = 0; i < numberOfPrivateKeys; i++) {
    try {
      result.push(
        ethers.Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${i}`).privateKey
      );
    } catch (Exception) {}
  }
}

module.exports = {
  solidity: {
    version: "0.8.13",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: providerUrl,
      },
      gasPrice: 0,
      initialBaseFeePerGas: 0,
      loggingEnabled: false,
      accounts: {
        mnemonic: developmentMnemonic,
      },
      allowUnlimitedContractSize: true,
      chainId: 1, // metamask -> accounts -> settings -> networks -> localhost 8545 -> set chainId to 1
    },
    localhost: {
      url: "http://localhost:8545",
      accounts: getPrivateKeysFromMnemonic(developmentMnemonic),
      gas: 2100000,
      gasPrice: 8000000000,
      allowUnlimitedContractSize: true,
    },
  },
  mocha: {
    timeout: 700000,
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v5",
  },
};
