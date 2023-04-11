Crosschain Deposit React App

# Contracts Dev

### Features

#### Supplied Chain

- Polygon -> BSC Mainnet
- Mumbai -> BSC Testnet
- Fuji -> BSC Testnet

#### Supplied Token

- Polygon : USDT, USDC
- Mumbai : USDC
- Fuji : USDC
- BSC Mainnet : USDT, BUSD
- BSC Testnet : USDT

### Configuration

create .env file

- **REACT_APP_PRIVATE_KEY** - Private key of account that is using for connect to chain
- **REACT_APP_CROSSCHAIN_DEPOSITOR_MUMBAI** - CrosschainDepositor on Mumbai
- **REACT_APP_CROSSCHAIN_DEPOSITOR_POLYGON** - CrosschainDepositor on Polygon
- **REACT_APP_ACCUMULATED_DEPOSITOR_BSC** - AccumulatedDepositor on BSC Mainnet
- **REACT_APP_ACCUMULATED_DEPOSITOR_BSC_TESTNET** - AccumulatedDepositor on BSC Testnet

### Destination Chain Gas Limit

You can set the destination gas limit from source chain
on _/src/data/stargate.json_

ex : Polygon to BSC Mainnet : **"dstGasForCall" : 150000**
Total gas is **1.65** MATIC

```
  "polygon": {
    "name": "Polygon",
    "chainId": 109,
    "feeLibrary": "0xd46ccf40d6dd371ade5c9d0e8f83354cf62285ed",
    "symbol": "MATIC",
    "dstGasForCall": 150000,
    "token": [
```

For Ethereum Mainnet, multiple test is required for this value

### Install

```
npm install
```

### Compile

```
npm compile
```

### Run

```
npm start
```
