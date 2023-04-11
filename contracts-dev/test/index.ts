import {adminable} from "./suites/adminable.test";
import {bolide} from "./suites/bolide.test";
import {treasuryVester} from "./suites/treasuryVester.test";
import {privateSale} from "./suites/privateSale.test";
import {storage} from "./suites/storage.test";
import {logic_liquidity} from "./suites/logic.liquidity.test";
import {logic_masterchef} from "./suites/logic.MasterChef.test";
import {lbf_strategy_farmingPair} from "./suites/lbf_strategy.farmingPair.test";
import {logic_swap} from "./suites/logic.swap.test";
import {versionable} from "./suites/versionable.test";
import {lbl_strategy} from "./suites/lbl_strategy.test";
import {lbf_strategy} from "./suites/lbf_strategy.test";
import {multiLogicProxy} from "./suites/multilogicproxy.test";
import {eth_strategy} from "./suites/eth_strategy.test";
import {multicallToLogic} from "./suites/multicall.test";
import {boosting} from "./suites/boosting.test";
import {storage_upgrade} from "./suites/storage.upgrade.test";
import {crosschain_deposit} from "./suites/crosschain_deposit.test";
import {storage_leaveToken} from "./suites/storage.leaveToken.test";
import {swap_environment} from "./suites/swap.environment";

describe("hardhatAdminable", adminable); // Hardhat
describe("hardhatBolide", bolide); // Hardhat
describe("hardhatTreasuryVester", treasuryVester); // Hardhat
describe("hardhatPrivateSale", privateSale); // Hardhat
describe("hardhatStorage", storage); // Hardhat
describe("hardhatBoosting", boosting); // Hardhat
describe("hardhatVersionable", versionable); // Hardhat
describe(
  "hardhatLendBorrowFarmStrategy - farmingPair",
  lbf_strategy_farmingPair
); // Hardhat
describe("hardhatStorageLeaveToken", storage_leaveToken); // hardhat
describe("LendBorrowLendStrategy", lbl_strategy); // BSC Mainnet
describe("LendBorrowFarmStrategy", lbf_strategy); // BSC Testnet
describe("MultiLogicProxy", multiLogicProxy); // BSC Mainnet
describe("Strategy with ETH", eth_strategy); // BSC Mainnet
describe("Multicall in Strategy to Logic", multicallToLogic); // BSC Testnet
describe("Logic Contract - liquidity", logic_liquidity); // BSC Mainnet
describe("Logic Contract - Swap", logic_swap); // BST Testnet
describe("Logic Contract - MasterChef", logic_masterchef); // BSC Testnet
describe("hardhatStorageUpgrade", storage_upgrade); // Hardhat
describe("Crosschain Deposit", crosschain_deposit); // Rinkybe, BSC Testnet
describe("SwapEnvironment", swap_environment); // BSC Testnet
