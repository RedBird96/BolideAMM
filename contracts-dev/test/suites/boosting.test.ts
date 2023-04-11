/*******************************************
 * Test on hardhat
 *******************************************/

import {ethers, upgrades} from "hardhat";
import {TokenDistributionModel} from "../../utils/TokenDistributionModel";
import {time} from "@openzeppelin/test-helpers";
import {
  ERC20,
  StorageV3,
  StorageV21,
  Aggregator,
  AggregatorN2,
  MultiLogic,
} from "../../typechain-types";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {expect} from "chai";
import {BigNumber} from "ethers";

async function deployContracts(
  owner: SignerWithAddress,
  multiLogicProxyContract: SignerWithAddress
) {
  let blid: ERC20,
    usdt: ERC20,
    usdtn2: ERC20,
    usdc: ERC20,
    storage: StorageV21,
    aggregator: Aggregator,
    aggregator2: AggregatorN2,
    model: TokenDistributionModel,
    multiLogicProxy: MultiLogic;

  model = new TokenDistributionModel();
  const logicContract = "0xee62f8548e7e97a6ae76d7cc42421ada906b129a";
  const Storage = await ethers.getContractFactory("StorageV21", owner);
  const Aggregator = await ethers.getContractFactory("Aggregator", owner);
  const AggregatorN2 = await ethers.getContractFactory("AggregatorN2", owner);
  const MultiLogicProxy = await ethers.getContractFactory("MultiLogic", owner);
  const USDT = await ethers.getContractFactory("ERC20", owner);
  const USDC = await ethers.getContractFactory("ERC20", owner);
  const BLID = await ethers.getContractFactory("ERC20", owner);
  const USDTN2 = await ethers.getContractFactory("ERC20", owner);

  aggregator = (await Aggregator.deploy()) as Aggregator;
  aggregator2 = (await AggregatorN2.deploy()) as AggregatorN2;
  blid = (await BLID.deploy("some erc20 as if BLID", "SERC")) as ERC20;
  usdt = (await USDT.deploy("some erc20", "SERC")) as ERC20;
  usdtn2 = (await USDTN2.deploy("some erc20", "SERC")) as ERC20;
  usdc = (await USDC.deploy("some erc20", "SERC")) as ERC20;

  storage = (await upgrades.deployProxy(Storage, [logicContract], {
    initializer: "initialize",
  })) as StorageV21;
  await storage.deployed();

  multiLogicProxy = (await upgrades.deployProxy(MultiLogicProxy, [], {
    kind: "uups",
    initializer: "__MultiLogicProxy_init",
  })) as MultiLogic;
  await multiLogicProxy.deployed();

  let tx;
  tx = await storage.connect(owner).setBLID(blid.address);
  await tx.wait(1);

  await storage.connect(owner).addToken(usdt.address, aggregator.address);
  await tx.wait(1);

  // tx = await storage.connect(owner).setMultiLogicProxy(multiLogicProxy.address);
  // await tx.wait(1);

  tx = await multiLogicProxy.connect(owner).setStorage(storage.address);
  await tx.wait(1);

  return {
    blid,
    usdt,
    usdtn2,
    usdc,
    storage,
    multiLogicProxy,
    aggregator,
    aggregator2,
    model,
  };
}

// Your Ethereum wallet private key

const MaxBlidPerUSD = 3;
const OverDepositPerUSD = 1;
const BlidPerBlock: BigNumber = ethers.utils.parseEther("10"); // BLID
const MaxBlidPerBlock: BigNumber = ethers.utils.parseEther("200"); // BLID

const secondBlidPerBlock: BigNumber = ethers.utils.parseEther("7"); // BLID
const amountUSDTDeposit: BigNumber = ethers.utils.parseEther("6"); // USDT

let UpdatedBlidPerBlock: number;
let startBlock: number, currentBlock: number;
let user1DepositAmount: BigNumber;
let user2DepositAmount: BigNumber;
const NumeralBlidPerBlock = Number.parseInt(
  ethers.utils.formatEther(BlidPerBlock)
);

//describe("boosting", async () => {
export const boosting = () => {
  let blid: ERC20, usdt: ERC20, usdtn2: ERC20, usdc: ERC20;
  let storage: StorageV21,
    aggregator: Aggregator,
    aggregator2: AggregatorN2,
    multiLogicProxy: MultiLogic,
    model: TokenDistributionModel;
  let owner: SignerWithAddress,
    logicContract: SignerWithAddress,
    multiLogicProxyContract: SignerWithAddress,
    other1: SignerWithAddress,
    other2: SignerWithAddress,
    expenseer: SignerWithAddress;

  before(async () => {
    [owner, logicContract, multiLogicProxyContract, other1, other2, expenseer] =
      await ethers.getSigners();
    const contracts = await deployContracts(owner, multiLogicProxyContract);

    blid = contracts.blid;
    usdt = contracts.usdt;
    usdtn2 = contracts.usdtn2;
    storage = contracts.storage;
    multiLogicProxy = contracts.multiLogicProxy;
    aggregator = contracts.aggregator;
    aggregator2 = contracts.aggregator2;
    model = contracts.model;
  });
  before(async () => {
    await usdt
      .connect(owner)
      .transfer(other1.address, ethers.utils.parseEther("100000"));

    await usdt
      .connect(owner)
      .transfer(other2.address, ethers.utils.parseEther("100000"));

    await blid
      .connect(owner)
      .transfer(expenseer.address, ethers.utils.parseEther("100000"));

    await blid
      .connect(owner)
      .transfer(other1.address, ethers.utils.parseEther("100000"));

    await blid
      .connect(owner)
      .transfer(other2.address, ethers.utils.parseEther("100000"));

    await storage.connect(owner).setBoostingAddress(expenseer.address);
  });

  describe("setBoostingInfo", async () => {
    it("only owner can set boosting info", async () => {
      const tx = await expect(
        storage
          .connect(other1)
          .setBoostingInfo(MaxBlidPerUSD, BlidPerBlock, MaxBlidPerBlock)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
    it("set boosting info", async () => {
      const tx = await storage
        .connect(owner)
        .setBoostingInfo(MaxBlidPerUSD, BlidPerBlock, MaxBlidPerBlock);

      const maxBlidPerUSD = await storage.connect(owner).maxBlidPerUSD();
      const blidPerBlock = await storage.connect(owner).blidPerBlock();
      const maxBlidPerBlock = await storage.connect(owner).maxBlidPerBlock();

      expect(maxBlidPerUSD).to.be.equal(
        MaxBlidPerUSD,
        "maxBlidPerUSD should be same"
      );
      expect(blidPerBlock).to.be.equal(
        BlidPerBlock,
        "blidPerBlock should be same"
      );
      expect(maxBlidPerBlock).to.be.equal(
        MaxBlidPerBlock,
        "maxBlidPerBlock should be same"
      );
    });
  });

  describe("depositBLID", async () => {
    before(async () => {
      const tx = await usdt
        .connect(other1)
        .approve(storage.address, ethers.utils.parseEther("10000000000"));
      const tx1 = await blid
        .connect(other1)
        .approve(storage.address, ethers.utils.parseEther("10000000000"));
    });
    it("user must deposit stablecoin before deposit BLID", async () => {
      const tx = await expect(
        storage.connect(other1).depositBLID(amountUSDTDeposit)
      ).to.be.revertedWith("E11");
    });

    it("user deposit USDT", async () => {
      const beforeBalance = await usdt.balanceOf(other1.address);
      const tx = await storage
        .connect(other1)
        .deposit(amountUSDTDeposit, usdt.address);
      const afterBalance = await usdt.balanceOf(other1.address);
      expect(beforeBalance.toBigInt()).to.be.equal(
        afterBalance.add(amountUSDTDeposit).toBigInt(),
        "Deposit USDT"
      );
    });

    it("user deposit BLID for boosting", async () => {
      const beforeBlidbalance = await blid.balanceOf(other1.address);
      const depositAmount = amountUSDTDeposit.mul(
        MaxBlidPerUSD + OverDepositPerUSD
      );
      user1DepositAmount = amountUSDTDeposit.mul(MaxBlidPerUSD);
      await storage.connect(other1).depositBLID(depositAmount);
      const afterBlidbalance = await blid.balanceOf(other1.address);
      expect(beforeBlidbalance).to.be.equal(
        afterBlidbalance.add(depositAmount),
        "Deposit BLID"
      );
    });
  });

  describe("getClaim", async () => {
    before(async () => {
      await time.advanceBlock();
      startBlock = await ethers.provider.getBlockNumber();
    });
    it("get boosting claimable BLID after one block", async () => {
      const usdBalance = (await storage.balanceOf(other1.address)).mul(
        MaxBlidPerUSD
      );
      const claimableAmount = await storage.getBoostingClaimableBLID(
        other1.address
      );
      expect(claimableAmount).to.be.equal(
        usdBalance.mul(NumeralBlidPerBlock),
        "Not same claimable amount"
      );
    });
  });

  describe("second deposit", async () => {
    before(async () => {
      const tx2 = await usdt
        .connect(other2)
        .approve(storage.address, ethers.utils.parseEther("10000000000"));
      const tx3 = await blid
        .connect(other2)
        .approve(storage.address, ethers.utils.parseEther("10000000000"));
    });
    it("second user deposit USDT", async () => {
      const beforeBalance = await usdt.balanceOf(other2.address);
      const tx = await storage
        .connect(other2)
        .deposit(amountUSDTDeposit, usdt.address);
      const afterBalance = await usdt.balanceOf(other2.address);
      expect(beforeBalance.toBigInt()).to.be.equal(
        afterBalance.add(amountUSDTDeposit).toBigInt(),
        "Deposit USDT"
      );
    });
    it("blidPerBlock should be decreased after second deposit", async () => {
      const beforeBlidperBlock = await storage.blidPerBlock();
      user2DepositAmount = amountUSDTDeposit.div(3).mul(MaxBlidPerUSD);
      const tx = await storage.connect(other2).depositBLID(user2DepositAmount);
      const blidperBlock = await storage.blidPerBlock();
      UpdatedBlidPerBlock = Number.parseInt(
        ethers.utils.formatEther(blidperBlock)
      );
      expect(blidperBlock).to.be.below(
        beforeBlidperBlock,
        "blidPerBlock should be decreased"
      );
    });
  });

  describe("getClaim after decreased blidPerBlock after second deposit", async () => {
    before(async () => {
      await time.advanceBlock();
      currentBlock = await ethers.provider.getBlockNumber();
    });
    it("get boosting claimable BLID after blocks passed again", async () => {
      const claimableAmount1 = await storage.getBoostingClaimableBLID(
        other1.address
      );
      const claimableAmount2 = await storage.getBoostingClaimableBLID(
        other2.address
      );
      const blockCount = currentBlock - startBlock;
      const user1BLIDbalacen = (await storage.balanceOf(other1.address)).mul(
        MaxBlidPerUSD
      );
      
      const beforeExpectUser1Amount = user1BLIDbalacen
        .mul(NumeralBlidPerBlock)
        .mul(blockCount)
        .add(user1BLIDbalacen.mul(NumeralBlidPerBlock));
      const beforeExpectUser2Amount = user2DepositAmount.mul(NumeralBlidPerBlock);

      expect(claimableAmount1).to.be.below(
        beforeExpectUser1Amount,
        "Must below calculation with prev blidperBlock"
      );
      expect(claimableAmount2).to.be.below(
        beforeExpectUser2Amount,
        "Must below calculation with prev blidperBlock"
      );
    });
  });

  describe("update blidperblock", async () => {
    it("blidperblock * totalSupplyBLID should not be greater than maxBlidPerUSD", async () => {
      const tx = await expect(
        storage
          .connect(owner)
          .setBoostingInfo(MaxBlidPerUSD, BlidPerBlock, MaxBlidPerBlock)
      ).to.be.revertedWith("E13");
    });

    it("update boosting info", async () => {
      const tx = await storage
        .connect(owner)
        .setBoostingInfo(MaxBlidPerUSD, secondBlidPerBlock, MaxBlidPerBlock);
      const blidperBlock = await storage.blidPerBlock();
      expect(blidperBlock).to.be.equal(
        secondBlidPerBlock,
        "BlidPerBlock does not udpated"
      );
      UpdatedBlidPerBlock = Number.parseInt(
        ethers.utils.formatEther(secondBlidPerBlock)
      );
    });
  });

  describe("claim reward BLID", async () => {
    before(async () => {
      await blid
        .connect(expenseer)
        .approve(storage.address, ethers.utils.parseEther("100000"));

      await time.advanceBlock();
      currentBlock = await ethers.provider.getBlockNumber();
    });
    it("claim BLID", async () => {
      const beforeBlidbalance = await blid.balanceOf(other1.address);
      const tx = await storage.connect(other1).claimBoostRewardBLID();
      const afterBlidbalance = await blid.balanceOf(other1.address);
      expect(afterBlidbalance).to.be.above(
        beforeBlidbalance,
        "BLID balance of other should be increased"
      );
    });
  });

  describe("third deposit", async () => {
    before(async () => {
      await time.advanceBlock();
    });
    it("blidPerBlock should not be changed for user1 deposit", async () => {
      const beforeBlidperBlock = await storage.blidPerBlock();
      const depositAmount = amountUSDTDeposit.div(2).mul(MaxBlidPerUSD - 1);
      user1DepositAmount = user1DepositAmount.add(depositAmount);
      const tx = await storage.connect(other1).depositBLID(depositAmount);
      const blidperBlock = await storage.blidPerBlock();
      expect(blidperBlock).to.be.equal(
        beforeBlidperBlock,
        "BlidPerBlock should be decreased"
      );
    });

    it("blidPerBlock should be decrease for user2 deposit", async () => {
      const beforeBlidperBlock = await storage.blidPerBlock();
      const depositAmount = amountUSDTDeposit.div(2).mul(MaxBlidPerUSD);
      user1DepositAmount = user1DepositAmount.add(depositAmount);
      const tx = await storage.connect(other2).depositBLID(depositAmount);
      const blidperBlock = await storage.blidPerBlock();
      expect(blidperBlock).to.be.below(
        beforeBlidperBlock,
        "BlidPerBlock should be decreased"
      );
    });
  });

  describe("first withdraw", async () => {
    before(async () => {
      await time.advanceBlock();
    });
    it("blidPerBlock should not be changed and claimed BLID", async () => {
      const withdrawAmount = amountUSDTDeposit;
      const beforeBlidperBlock = await storage.blidPerBlock();
      const beforeBlidbalance = await blid.balanceOf(other1.address);
      const tx = await storage.connect(other1).withdrawBLID(withdrawAmount);
      const blidperBlock = await storage.blidPerBlock();
      const afterBlidbalance = await blid.balanceOf(other1.address);
      expect(blidperBlock).to.be.equal(
        beforeBlidperBlock,
        "BlidPerBlock should not be changed"
      );
      expect(afterBlidbalance).to.be.above(beforeBlidbalance, "Claimed BLID");
    });
  });

  describe("second withdraw", async () => {
    before(async () => {
      await time.advanceBlock();
    });
    it("blidPerBlock should be increased and claimed BLID", async () => {
      const withdrawAmount = amountUSDTDeposit.mul(MaxBlidPerUSD - 1);
      const beforeBlidperBlock = await storage.blidPerBlock();
      const beforeBlidbalance = await blid.balanceOf(other1.address);
      const tx = await storage.connect(other1).withdrawBLID(withdrawAmount);
      const blidperBlock = await storage.blidPerBlock();
      const afterBlidbalance = await blid.balanceOf(other1.address);
      expect(blidperBlock).to.be.above(
        beforeBlidperBlock,
        "BlidPerBlock should be increased"
      );
      expect(afterBlidbalance).to.be.above(beforeBlidbalance, "Claimed BLID");
    });
  });

  describe("claim reward BLID", async () => {
    before(async () => {
      await time.advanceBlock();
    });
    it("claim BLID", async () => {
      const beforeBlidbalance = await blid.balanceOf(other1.address);
      const beforeBlidbalance2 = await blid.balanceOf(other2.address);
      const tx1 = await storage.connect(other1).claimBoostRewardBLID();
      const tx = await storage.connect(other2).claimBoostRewardBLID();
      const afterBlidbalance = await blid.balanceOf(other1.address);
      const afterBlidbalance2 = await blid.balanceOf(other2.address);
      expect(afterBlidbalance).to.be.above(beforeBlidbalance, "Claim BLID");
      expect(afterBlidbalance2).to.be.above(beforeBlidbalance2, "Claim BLID");
    });
  });
};
