Strategy contract development with hardhat

# Contracts Dev

### Features

Storage, Strategy, Logic, MultiLogicProxy

### Install

```
yarn install
```

### Compile

```
yarn compile
```

### Configuration

create .env file

#### For multilogic deployment:

- **PRIVATE_KEY** - Private key of account that is using for deployment
- **ETHERSCAN_APIKEY** - BSC mainnet etherscan API KEY
- **MAINNET_BSC_PROVIDER_URL** - bsc provider ulr (quicknode, etc..)
- **AGGREGATOR_ADDRESS** - Aggregator Address
- **MULTILOGIC_PROXY_ADDRESS** - MultiLogicProxy Address
- **STORAGE_PROXY_ADDRESS** - Storage Address
- **MULTILOGIC_FORCE_INIT** - ptional boolean variable that could help process only init transactions
- **STORAGE_FORCE_INIT** - optional boolean variable that could help process only init transactions
- **MULTILOGIC_FORCE_UPGRADE** - ptional boolean variable that could help process only upgrade transactions
- **STORAGE_FORCE_UPGRADE** - optional boolean variable that could help process only upgrade transactions
- **CONTRACT_VERSION** - set version of contracts
- **CONTRACT_PURPOSE** - optional string variable with purpose of contract. could help when we have several same contracts with different sets of data
- **CONTRACT_ENV** - optional string variable with env of contract

#### For LBL Strategy Deployment:

- **PRIVATE_KEY** - Private key of account that is using for deployment
- **ETHERSCAN_APIKEY** - BSC mainnet etherscan API KEY
- **MAINNET_BSC_PROVIDER_URL** - bsc provider ulr (quicknode, etc..)
- **MULTILOGIC_PROXY_ADDRESS** - MultiLogicProxy Address
- **LBL_LOGIC_PROXY_ADDRESS** - LendBorrowLend Logic Address
- **LBL_STRATEGY_PROXY_ADDRESS** - LendBorrowLend Strategy Address
- **LBL_LOGIC_FORCE_INIT** - optional boolean variable that could help process only init transactions
- **LBL_STRATEGY_FORCE_INIT** - optional boolean variable that could help process only init transactions
- **LBL_LOGIC_FORCE_UPGRADE** - optional boolean variable that could help process only upgrade transactions
- **LBL_STRATEGY_FORCE_UPGRADE** - optional boolean variable that could help process only upgrade transactions
- **CONTRACT_VERSION** - set version of contracts
- **CONTRACT_PURPOSE** - optional string variable with purpose of contract. could help when we have several same contracts with different sets of data
- **CONTRACT_ENV** - optional string variable with env of contract

#### For LBF Strategy Deployment:

- **PRIVATE_KEY** - Private key of account that is using for deployment
- **ETHERSCAN_APIKEY** - BSC mainnet etherscan API KEY
- **MAINNET_BSC_PROVIDER_URL** - bsc provider ulr (quicknode, etc..)
- **MULTILOGIC_PROXY_ADDRESS** - MultiLogicProxy Address
- **LBF_LOGIC_PROXY_ADDRESS** - LendBorrowFarm Logic Address
- **LBF_STRATEGY_PROXY_ADDRESS** - LendBorrowFarm Strategy Address
- **LBF_LOGIC_FORCE_INIT** - optional boolean variable that could help process only init transactions
- **LBF_STRATEGY_FORCE_INIT** - optional boolean variable that could help process only init transactions
- **LBF_LOGIC_FORCE_UPGRADE** - optional boolean variable that could help process only upgrade transactions
- **LBF_STRATEGY_FORCE_UPGRADE** - optional boolean variable that could help process only upgrade transactions
- **CONTRACT_VERSION** - set version of contracts
- **CONTRACT_PURPOSE** - optional string variable with purpose of contract. could help when we have several same contracts with different sets of data
- **CONTRACT_ENV** - optional string variable with env of contract

#### For Contracts Setting Up:

- **PRIVATE_KEY** - Private key of account that is using for deployment
- **MAINNET_BSC_PROVIDER_URL** - bsc provider ulr (quicknode, etc..)
- **MULTILOGIC_SETTING_UP** - make setting up for multiLogicProxy or not (boolean)
- **STORAGE_SETTING_UP** - make setting up for StorageV3 or not (boolean)
- **MULTILOGIC_PROXY_ADDRESS** - MultiLogicProxy Address
- **LBF_LOGIC_PROXY_ADDRESS** - LendBorrowFarm Logic Address
- **LBF_STRATEGY_PROXY_ADDRESS** - LendBorrowFarm Strategy Address
- **LBL_LOGIC_PROXY_ADDRESS** - LendBorrowLend Logic Address
- **LBL_STRATEGY_PROXY_ADDRESS** - LendBorrowLend Strategy Address
- **STORAGE_LEAVE_LIMIT** - required, limit for storage leave token for percentage (Dev: 1000, Production 300000)
- **STORAGE_LEAVE_PERCENTAGE** - required, leave token amount base on token deposit (Dev: 1000, Production 150)
- **STORAGE_LEAVE_FIXED** - required, leave token amount if deposit is over limit (Dev: 100, Production 5000)

### For Cross Chain Deposit:

- **ACCUMULATED_DEPOSITOR_ADDRESS** - bsc AccumulatedDepositor Address
- **CROSSCHAIN_DEPOSITOR_ADDRESS** - eth CrossChainDepositor Address

### For MultiSig

- **GNOSIS_SAFE_ADDRESS** - Gnosis safe wallet address to use multisig
- **GNOSIS_SAFE_MULTICALL_ADDRESS** - To support Multicall on gnosis (0x40A2aCCbd92BCA938b02010E17A5b8929b49130D)

#### For Contract Upgrade:

- **UPGRADE_PROXY_ADDRESS** - required, Proxy address to be upgrade
- **UPGRADE_FORCEIMPORT** - If forceImport is required, set to be true
- **UPGRADE_CONTRACT_OLD** - If forceImport is required, Old implementation contract name
- **UPGRADE_CONTRACT_NEW** - required, new implementation contract name to upgrade
- **UPGRADE_USE_MULTISIG** - If multisig is required, set to be true

#### Local tests running:

- **MAINNET_BSC_PROVIDER_URL** - bsc provider ulr (quicknode, etc..)
- **TESTNET_BSC_PROVIDER_URL** - bsc testnet provider ulr (quicknode, etc..)
- **PRIVATE_KEY** - Private key of account that is using for deployment

#### CI tests running:

- **MAINNET_BSC_PROVIDER_URL** - bsc provider ulr (quicknode, etc..)

#### Other possible variables (for tests):

- **TESTNET_RINKEBY_PROVIDER_URL** - https://rinkeby.infura.io/v3/985791a172364b08a7850df89e8659a2
- **PRIVATE_KEY_TEST** - Private key of account for testing

### Versioning

- All our strategies has independed deploy script and also each smart contract could be tagged by version and purpose
- All deployments to our env should be processed with versioned pack of contracts

To make new strategy version run this script:

```
make save-strategy-version strategy=[strategy_name] version=[new_strategy_version]
```

To make new multilogic version run this script:

```
make save-multilogic-version version=[new_strategy_version]
```

where is:

- strategy_name - **lbl** or **lbf** (for now)
- version - custom version for that pack

There will be created an new directory with contract snapshot:

```
./versions/[strategy_name]/[strategy_version]/contracts/ - pack of migrations

./versions/[strategy_name]/[strategy_version]/contracts/migrations/migrate_[strategy_name].ts - specific migration with fixed version

./versions/[strategy_name]/[strategy_version]/changes.md - file where you should fill changes that that pack contains
```

### Artifacts

We use openzeppelin upgradable artifcast and we should to keep it fresh for upgrading.

We keep artifacts in **contract_artifacts** directory. With this scheme:

```
./contract_artifacts/
./contract_artifacts/{env_name}/
./contract_artifacts/{env_name}/{purpose_name}/
./contract_artifacts/{env_name}/{purpose_name}/openzeppelin/
./contract_artifacts/{env_name}/{purpose_name}/openzeppelin/unknown-56.json
```

> NOTE:
>
> - you could use **CONTRACT_ENV** env var instead of **env** arg
> - you could use **CONTRACT_PURPOSE** env var instead of **purpose** arg

To make new snaphsot of artifacts run this script:

````

make save-artifacts env=[env name] purpose=[purpose: eth, btc, stablecoins, etc.]

```

Before you run upgrade script please restore the artifacts with current script:

```

make restore-artifacts env=[env name] purpose=[purpose: eth, btc, stablecoins, etc.]

```

### Depolyment

> NOTE: Please set this env var if you use deploy command from yarn.
>
> - **CONTRACT_ENV** to set env of contract
> - **CONTRACT_PURPOSE** to set purpose of contract

- Bolide

```

npx hardhat run ./scripts-hardhat/deploy_bolide.ts --network [network_name]

```

- Multilogic

MultiLogicProxy, Storage, Aggregator

- Command

```

yarn deploy-multilogic --network [network_name]

```

- LBL Strategy

LendBorrowLend - Logic, LendBorrowLendStrategy

- Command

```

yarn deploy-lbl --network [network_name]

```

- LBF Strategy

LendBorrowFarm - Logic, LendBorrowFarmStrategy

- Command

```

yarn deploy-lbf --network [network_name]

```

- Connect Strategies to multilogic

- Command

```

yarn connect-strategies --network [network_name]

```

### Verify

```

npx hardhat verify --network bsc [Proxy Address]

````

### Testing

/test/index.ts

- Test script selection
  Enable relevant test script to add "describe.**only**"

  ```Javacript
  describe.only("Bolide", bolide);                            // Hardhat
  describe("TreasuryVester", treasuryVester);                 // Hardhat
  describe("PrivateSale", privateSale);                       // Hardhat
  describe("Storage", storage);                               // Hardhat
  describe("Logic Contract - liquidity", logic_liquidity);    // BSC Testnet
  describe("Logic Contract - Swap", logic_swap);              // BST Testnet
  describe("Logic Contract - MasterChef", logic_masterchef);  // BSC Testnet
  describe("Logic Contract - reserve Pair", logic_reserve);   // BSC Testnet
  describe("Logic Contract - Storage", logic_storage);        // BSC Mainnet
  describe("Logic Contract - Compound", logic_compound);      // BSC Mainnet
  describe("low_risk Strategy", low_risk_strategy);           // BSC Mainnet
  ```

````

- Test Command

  For all tests:

  ```
  yarn test
  ```

  For local/ci-cd tests:

  ```
  yarn test-local
  ```

##### MultiLogicProxy (/test/suites/multilogicproxy.test.ts)

BSC Mainnet

##### LendBorrowFarm Strategy (/test/suites/lbf_strategy.test.ts)

BSC Mainnet

##### LendBorrowFarm reserveLiquidity functions (/test/suites/lbf_strategy.reserve.js)

Hardhat test

- addReserveLiquidity
- deleteLastReserveLiquidity
- getReserve
- getReservesCount

##### LendBorrowLend Strategy (/test/suites/lbl_strategy.test.ts)

BSC Mainnet

##### Strategy with ETH (/test/suites/eth_strategy.test.ts)

BSC Mainnet

##### Multicall to Logic (/test/suites/multicall.test.ts)

Rinkeby

##### Adminable (/test/suites/adminable.test.ts)

Hardhat test

#### Logic Contract

##### pancakeswap Swap functions (/test/suites/logic.swap.js)

BSC Testnet

- swapExactETHForTokens
- swapExactTokensForTokens
- swapExactTokensForETH
- swapETHForExactTokens
- swapTokensForExactTokens
- swapTokensForExactETH

##### pancakeswap liquidity functions (/test/suites/logic.liquidity.js)

BSC Testnet

- addLiquidity
- removeLiquidity
- addLiquidityETH
- removeLiquidityETH

##### pancakeswap MasterChef functions (/test/suites/logic.MasterChef.js)

BSC Testnet

- enterStaking
- leaveStaking
- deposit
- withdraw

#### TreasuryVester Contract (/test/suites/treasuryVester.js)

Hardhat test

#### Bolide Contract (/test/suites/bolide.js)

Hardhat test

#### PrivateSale Contract (/test/suites/privateSale.js)

Hardhat test

#### Storage (/test/suites/storage.test.ts)

Hardhat test

### Error Codes

Each contract has its own error code symbol starting 1

#### Storage

- E1 : Token should be added
- E2 : msg.sender should be logic contract
- E3 : deposit amount should be > 0
- E4 : deposit amount should be greater than withdraw amount
- E5 : reserve amount should be greater than balance (BLID)
- E6 : token has been already added
- E7 : accumulatedRewardsPerShare should be 0
- E8 : msg.sender should be MultiLogicProxy
- E9 : BNB is not transfered to contract
- E10 : failed to send Ether
- E11 : BLID deposit amount should be less
- E12 : withdraw BLID amount less than balance
- E13 : BlidPerBlock should be less
- E14 : Sender is not AccumulatedDepositor
- E15 : LeaveTokenLimit should be increased all the time

#### OwnableUpgradeableAdminable

- OA1 : msg.sender is not admin
- OA2 : msg.sender is not admin or owner

#### OwnableUpgradeableVersionable

- OV1 : version should not be blank

#### Logic

- E1 : msg.sender is not storage
- E2 : xToken should be added via addXTokens
- E3 : swapRouter should be added during initialization
- E4 : swapMaster should be added during initialization
- E5 : Tokens are added already
- E6 : BLID has been already taken
- E7 : Storage has been already taken
- E8 : Token type should be venus/ola (0/1)
- E9 : mint amount should be > 0
- E10 : Get liquidity is failing
- E11 : shortfall should be 0
- E12 : liquidity should be > 0
- E14 : msg.sender should be MultiLogicProxy
- E15 : MultiLogicProxy address cannot be blank
- E16 : BNB is not transfered to contract
- E17 : failed to send Ether

#### LendBorrowLendStrategy

- L1 : msg.sender should be MultiLogicProxy contract
- L2 : token should be inited
- L3 : BLID has been already taken
- L4 : storage has been already taken
- L5 : MultiLogicProxy has been already taken
- L6 : length of path should be > 2
- L7 : path should start with rewardsToken
- L8 : path should end with BLID
- L9 : pathToSwapRewardsToBLID should be inited
- L10 : token is already inited
- L11 : collateralFactor should be > 0
- L12 : token balance should be > 0
- L99 : Multicall to Logic failling

#### LendBorrowFarmStrategy

- F1 : msg.sender should be MultiLogicProxy contract
- F2 : token should be inited
- F3 : BLID has been already taken
- F4 : storage has been already taken
- F5 : multiLogicProxy has been already taken
- F6 : token is already inited
- F7 : delete index is out of range
- F8 : indexesToDelete should be assoc sorted
- F99 : Multicall to Logic failling

#### MultiLogicProxy

- M1 : msg.sender should be storage contract
- M2 : strategy count should be same
- M3 : total percent should be 100%
- M4 : msg.sender is not existed Logic
- M5 : storage has been already inited
- M6 : exceeds the divide amount
- M7 : BNB is not transfered to contract
- M8 : failed to send Ether
- M9 : already exist strategy
- M10 : not exist strategy


#### AccumulatedDepositor

- AD1 : Storage contract has been added already
- AD2 : Token should be added via addStargateToken()
- AD3 : Token address should not be address(0)
- AD4 : Token as been added already
- AD5 : Only StargateRouter can call sgReceive() method

#### CrossChainDepositor

- CD1 : Token should be added via addStargateToken()
- CD2 : Token address should not be address(0)
- CD3 : Token as been added already
- CD4 : AccumulateDepositor should be added
- CD5 : Some eth is required
- CD6 : Deposit amout should be > 0
- CD7 : Transaction gas fee is too small
- CD8 : AccumulateDepositor has been added already
````
