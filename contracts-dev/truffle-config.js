const path = require("path");

const HDWalletProvider = require("@truffle/hdwallet-provider")
let secrets = require("./secrets")
const fs = require("fs")
const infuraKey = fs.readFileSync(".infura_secret").toString().trim()
const e_mnemonic = fs.readFileSync(".e_pk").toString().trim()

module.exports = {//rinkeby
  networks: {
    // ropsten: {
      
    //   provider: new HDWalletProvider(
    //     secrets.staging.key,
    //     `https://ropsten.infura.io/v3/${infuraKey}`
    //   ),
    //   network_id: 3, // Ropsten's id
    //   gas: 5500000, // Ropsten has a lower block limit than mainnet
    //   confirmations: 2, // # of confs to wait between deployments. (default: 0)
    //   timeoutBlocks: 200, // # of blocks before a deployment times out  (minimum/default: 50)
    //   skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    // },
    //  rinkeby: {
      
    //   provider: new HDWalletProvider(
    //     secrets.staging.key,
    //     `https://rinkeby.infura.io/v3/${infuraKey}`
    //   ),
    //   network_id: 4,
    //   gasPrice: 10000000000,
    // },
    // kovan: {
    //   provider: new HDWalletProvider(
    //     secrets.staging.key,
    //     `https://kovan.infura.io/v3/${infuraKey}`
    //   ),
    //   network_id: 42,
    //   gasPrice: 10000000000,
    // },
    testnet: {
      provider: () => new HDWalletProvider(mnemonic, `https://data-seed-prebsc-1-s3.binance.org:8545`),
      network_id: 97,
      confirmations: 1,
      timeoutBlocks: 300,
      skipDryRun: false,
      gasPrice: 10000000000,

      
    },
    bsc_staging: {
      // provider: () => new HDWalletProvider(mnemonic, `https://apis-sj.ankr.com/eb610c5ae19d469c91e596d6c511cf18/e12886baff836d9659d0a59d82b4e19a/binance/full/main`),
      // provider: () => new HDWalletProvider(mnemonic, `https://apis.ankr.com/16d7b5c8dec541cab3147308ba67fd0a/e12886baff836d9659d0a59d82b4e19a/eth/fast/main`),
      provider: () => new HDWalletProvider(secrets.staging.key, secrets.staging.url),
      network_id: 56,
      confirmations: 1,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    bsc_alpha: {
      provider: () => new HDWalletProvider(secrets.alpha.key, secrets.alpha.url),
      network_id: 56,
      confirmations: 1,
      timeoutBlocks: 200
      // skipDryRun: true
    },
    bsc_prod: {
      provider: () => new HDWalletProvider(secrets.prod.key, secrets.prod.url),
      network_id: 56,
      confirmations: 1,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    bsct: {
      provider: () => new HDWalletProvider(secrets.staging.key, `https://apis-sj.ankr.com/8107e5449bcf4b49a7a8ffbfb807eba4/e12886baff836d9659d0a59d82b4e19a/binance/full/test`),
      network_id: 97,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },

    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*" // Match any network id
  
    },
    main: {
      provider: () => new HDWalletProvider(e_mnemonic, `https://apis.ankr.com/16d7b5c8dec541cab3147308ba67fd0a/e12886baff836d9659d0a59d82b4e19a/eth/fast/main`),
      network_id: 1,
      // confirmations: 1,
      // timeoutBlocks: 200,
      skipDryRun: true
    },
  },
  plugins: ['truffle-plugin-verify'],
  api_keys: {
    bscscan: 'SUU6Q7EACAHGVKVUV5KET3J2BEHSCT7W8K',
    etherscan: 'WJFAHYZH5A65JMA9VER497393JGWK7M4FV',
  },
  compilers: {
    
    solc: {
       settings: {
        optimizer: {
          enabled: true, // Default: false
          runs: 200     // Default: 200
         },
       },
      version: "0.8.13",
    }
  }
  
  // Uncommenting the defaults below 
  // provides for an easier quick-start with Ganache.
  // You can also follow this format for other networks;
  // see <http://truffleframework.com/docs/advanced/configuration>
  // for more details on how to specify configuration options!
  //
  //networks: {
  //  development: {
  //    host: "127.0.0.1",
  //    port: 7545,
  //    network_id: "*"
  //  },
  //  test: {
  //    host: "127.0.0.1",
  //    port: 7545,
  //    network_id: "*"
  //  }
  //},
  //
  // Truffle DB is currently disabled by default; to enable it, change enabled:
  // false to enabled: true. The default storage location can also be
  // overridden by specifying the adapter settings, as shown in the commented code below.
  //
  // NOTE: It is not possible to migrate your contracts to truffle DB and you should
  // make a backup of your artifacts to a safe location before enabling this feature.
  //
  // After you backed up your artifacts you can utilize db by running migrate as follows: 
  // $ truffle migrate --reset --compile-all
  //
  // db: {
    // enabled: false,
    // host: "127.0.0.1",
    // adapter: {
    //   name: "sqlite",
    //   settings: {
    //     directory: ".db"
    //   }
    // }
  // }
};
