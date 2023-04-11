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
const privateKey = process.env.PRIVATE_KEY;

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
        count: 30,
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
    bsc: {
      url: process.env.MAINNET_BSC_PROVIDER_URL,
      chainId: 56,
      gas: 2100000,
      gasPrice: 8000000000,
      accounts: [privateKey],
      addressesSet: "bsc",
    },
    bscDev: {
      url: process.env.MAINNET_BSC_PROVIDER_URL,
      chainId: 56,
      gas: 2100000,
      gasPrice: 8000000000,
      accounts: [privateKey],
      addressesSet: "bsc",
    },
    bscTestnet: {
      url: process.env.TESTNET_BSC_PROVIDER_URL,
      chainId: 97,
      gas: 2100000,
      gasPrice: 80000000000,
      accounts: [privateKey],
      addressesSet: "bscTestnet",
    },
    rinkeby: {
      url: process.env.TESTNET_RINKEBY_PROVIDER_URL,
      chainId: 4,
      gas: 2100000,
      gasPrice: 80000000000,
      accounts: [privateKey],
      addressesSet: "rinkeby",
    },
    polygon: {
      url: process.env.MAINNET_POLYGON_PROVIDER_URL,
      chainId: 137,
      gas: 2100000,
      gasPrice: 80000000000,
      accounts: [privateKey],
      addressesSet: "polygon",
    },
    mumbai: {
      url: process.env.TESTNET_MUMBAI_PROVIDER_URL,
      chainId: 80001,
      gas: 2100000,
      gasPrice: 80000000000,
      accounts: [privateKey],
      addressesSet: "mumbai",
    },
    fuji: {
      url: process.env.TESTNET_FUJI_PROVIDER_URL,
      chainId: 43113,
      gas: 2100000,
      gasPrice: 80000000000,
      accounts: [privateKey],
      addressesSet: "fuji",
    },
    goerli: {
      url: process.env.TESTNET_GOERLI_PROVIDER_URL,
      chainId: 5,
      gas: 2100000,
      gasPrice: 80000000000,
      accounts: [privateKey],
      addressesSet: "goerli",
      setTimeout: 50000000,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_APIKEY,
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
