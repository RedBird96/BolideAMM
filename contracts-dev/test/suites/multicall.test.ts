/*******************************************
 * Test on BSC Testnet
 * Before run test, deploy logic contract on testnet
 * owner should have 10000000000(wei) CAKE(0xFa60D973F7642B748046464e165A65B7323b0DEE) via mint() function
 *******************************************/

import dotenv from "dotenv";
import {ethers} from "hardhat";
import {expect} from "chai";
import {erc20Abi} from "../../data/contracts_abi/erc20.json";
import {
  Logic,
  Logic__factory,
  LendBorrowFarmStrategy,
  LendBorrowFarmStrategy__factory,
} from "../../typechain-types";
import {abi as LogicAbi} from "../../artifacts/contracts/Logic.sol/Logic.json";
import {multicall} from "../../utils/multicall";
import {ADDRESS_COLLECTION} from "../../data/addresses.json";
dotenv.config();

const provider = new ethers.providers.JsonRpcProvider(
  process.env.TESTNET_BSC_PROVIDER_URL,
  {name: "binance", chainId: 97}
);

// Load Addresses
const ADDRESSES = ADDRESS_COLLECTION.bscTestnet;

// Your Ethereum wallet private key
const owner = process.env.PRIVATE_KEY
  ? new ethers.Wallet(process.env.PRIVATE_KEY!, provider)
  : ethers.Wallet.createRandom();
const other = process.env.PRIVATE_KEY_TEST
  ? new ethers.Wallet(process.env.PRIVATE_KEY_TEST!, provider)
  : ethers.Wallet.createRandom();

// Testnet deployed Contract address
const lbfLogicAddress = process.env.LBF_LOGIC_PROXY_ADDRESS!;
const lbfStrategyAddress = process.env.LBF_STRATEGY_PROXY_ADDRESS!;
const masterChefAddress = ADDRESSES.PancakeMasterV2;
const CAKEAddress = ADDRESSES.Token.CAKE.Underlying;
const SYRUPAddress = ADDRESSES.Token.SYRUP.Underlying;

const CAKE = new ethers.Contract(CAKEAddress, erc20Abi, owner);
const SYRUP = new ethers.Contract(SYRUPAddress, erc20Abi, owner);

// Variables for deployed contract
let logic: Logic, lbfStrategy: LendBorrowFarmStrategy;

export const multicallToLogic = () => {
  before(async () => {
    logic = Logic__factory.connect(lbfLogicAddress, owner) as Logic;

    lbfStrategy = LendBorrowFarmStrategy__factory.connect(
      lbfStrategyAddress,
      owner
    ) as LendBorrowFarmStrategy;
  });

  describe("Test multicall", async () => {
    xit("Only admin can call multicall ", async () => {
      await multicall(other, lbfStrategy.address, JSON.stringify(LogicAbi), [
        {
          name: "enterStaking",
          params: [masterChefAddress, 30],
        },
        {
          name: "leaveStaking",
          params: [masterChefAddress, 20],
        },
      ]).should.be.revertedWith("OA2");
    });

    xit("Approve MasterChef on CAKE", async () => {
      await logic.connect(owner).approveTokenForSwap(CAKE.address);
    });

    xit("enterStaking with CAKE", async () => {
      let balanceCAKE = await CAKE.balanceOf(logic.address);
      let balanceSYRUP = await SYRUP.balanceOf(logic.address);

      const tx = await logic
        .connect(owner)
        .enterStaking(masterChefAddress, 1000);
      await tx.wait(1);

      let balanceCAKENew = await CAKE.balanceOf(logic.address);
      let balanceSYRUPNew = await SYRUP.balanceOf(logic.address);

      expect(balanceCAKENew.add("1000").toString()).to.be.eql(
        balanceCAKE.toString(),
        "CAKE balance of logic should be decreased by 1000"
      );
      expect(balanceSYRUP.add("1000").toString()).to.be.eql(
        balanceSYRUPNew.toString(),
        "SYRUP balance of logic should be increased by 1000"
      );
    });

    xit("leaveStaking with SYRUP", async () => {
      let balanceCAKE = await CAKE.balanceOf(logic.address);
      let balanceSYRUP = await SYRUP.balanceOf(logic.address);

      const tx = await logic
        .connect(owner)
        .leaveStaking(masterChefAddress, 1000);
      await tx.wait(1);

      let balanceCAKENew = await CAKE.balanceOf(logic.address);
      let balanceSYRUPNew = await SYRUP.balanceOf(logic.address);

      expect(balanceCAKE.add("1000").toString()).to.be.eql(
        balanceCAKENew.toString(),
        "CAKE balance of logic should be increased by 1000"
      );
      expect(balanceSYRUPNew.add("1000").toString()).to.be.eql(
        balanceSYRUP.toString(),
        "SYRUP balance of logic should be decreased by 1000"
      );
    });

    it("Cannot enter staking over CAKE balance", async () => {
      const result = await multicall(
        owner,
        lbfStrategy.address,
        JSON.stringify(LogicAbi),
        [
          {
            name: "enterStaking",
            params: [masterChefAddress, ethers.utils.parseEther("1000")],
          },
          {
            name: "leaveStaking",
            params: [masterChefAddress, 500],
          },
        ]
      ).should.be.revertedWith("F99");
    });

    it("multicall", async () => {
      let balanceCake = await CAKE.balanceOf(logic.address);
      const result = await multicall(
        owner,
        lbfStrategy.address,
        JSON.stringify(LogicAbi),
        [
          {
            name: "enterStaking",
            params: [masterChefAddress, 1000],
          },
          {
            name: "leaveStaking",
            params: [masterChefAddress, 500],
          },
        ]
      );

      let balanceCakeNew = await CAKE.balanceOf(logic.address);

      expect(balanceCakeNew.add("500").toString()).to.be.eql(
        balanceCake.toString(),
        "Cake balance of Logic should be decreased by 10"
      );
    });
  });
};
