/*******************************************
 * Test on hardhat
 *******************************************/
import dotenv from "dotenv";
import {ethers, upgrades} from "hardhat";
import {expect} from "chai";
import {ADDRESS_COLLECTION} from "../../data/addresses.json";
import {LendBorrowFarmStrategy} from "../../typechain-types";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";

dotenv.config();
// Load Addresses
const ADDRESSES = ADDRESS_COLLECTION.bsc;

interface IFarmingPair {
  tokenA: string;
  tokenB: string;
  xTokenA: string;
  xTokenB: string;
  swap: string;
  swapMaster: string;
  lpToken: string;
  poolID: number;
  path: any;
  pathTokenA2BNB: any;
  pathTokenB2BNB: any;
}

export const lbf_strategy_farmingPair = () => {
  let strategy: LendBorrowFarmStrategy;
  let owner: SignerWithAddress,
    tokenA1: SignerWithAddress,
    tokenA2: SignerWithAddress,
    tokenA3: SignerWithAddress,
    tokenA4: SignerWithAddress,
    tokenA5: SignerWithAddress,
    tokenB1: SignerWithAddress,
    tokenB2: SignerWithAddress,
    tokenB3: SignerWithAddress,
    tokenB4: SignerWithAddress,
    tokenB5: SignerWithAddress,
    oTokenA1: SignerWithAddress,
    oTokenA2: SignerWithAddress,
    oTokenA3: SignerWithAddress,
    oTokenA4: SignerWithAddress,
    oTokenA5: SignerWithAddress,
    oTokenB1: SignerWithAddress,
    oTokenB2: SignerWithAddress,
    oTokenB3: SignerWithAddress,
    oTokenB4: SignerWithAddress,
    oTokenB5: SignerWithAddress,
    LP1: SignerWithAddress,
    LP2: SignerWithAddress,
    LP3: SignerWithAddress,
    LP4: SignerWithAddress,
    LP5: SignerWithAddress,
    other: SignerWithAddress,
    pairs: Array<IFarmingPair>;

  before(async () => {
    [
      owner,
      tokenA1,
      tokenA2,
      tokenA3,
      tokenA4,
      tokenA5,
      tokenB1,
      tokenB2,
      tokenB3,
      tokenB4,
      tokenB5,
      oTokenA1,
      oTokenA2,
      oTokenA3,
      oTokenA4,
      oTokenA5,
      oTokenB1,
      oTokenB2,
      oTokenB3,
      oTokenB4,
      oTokenB5,
      LP1,
      LP2,
      LP3,
      LP4,
      LP5,
      other,
    ] = await ethers.getSigners();

    // Deploy strategy
    const Strategy = await ethers.getContractFactory("LendBorrowFarmStrategy");
    strategy = (await upgrades.deployProxy(
      Strategy,
      [
        ADDRESSES.VenusController,
        ADDRESSES.ApeswapRouter,
        ADDRESSES.Token.BANANA.Underlying,
        other.address,
      ],
      {
        kind: "uups",
        initializer: "__LendBorrowFarmStrategy_init",
      }
    )) as LendBorrowFarmStrategy;
    await strategy.deployed();

    // Define Pair
    pairs = new Array<IFarmingPair>();
    pairs.push({
      tokenA: tokenA1.address,
      tokenB: tokenB1.address,
      xTokenA: oTokenA1.address,
      xTokenB: oTokenB1.address,
      swap: ADDRESSES.PancakeRouter,
      swapMaster: ADDRESSES.PancakeMasterV2,
      lpToken: LP1.address,
      poolID: 1,
      path: [
        [tokenA1.address, tokenB1.address],
        [oTokenA1.address, oTokenB1.address],
      ],
      pathTokenA2BNB: [tokenA1.address, tokenB1.address],
      pathTokenB2BNB: [tokenA1.address, tokenB1.address],
    });

    pairs.push({
      tokenA: tokenA2.address,
      tokenB: tokenB2.address,
      xTokenA: oTokenA2.address,
      xTokenB: oTokenB2.address,
      swap: ADDRESSES.PancakeRouter,
      swapMaster: ADDRESSES.PancakeMasterV2,
      lpToken: LP2.address,
      poolID: 2,
      path: [
        [tokenA2.address, tokenB2.address],
        [oTokenA2.address, oTokenB2.address],
      ],
      pathTokenA2BNB: [tokenA2.address, tokenB2.address],
      pathTokenB2BNB: [oTokenA2.address, oTokenB2.address],
    });

    pairs.push({
      tokenA: tokenA3.address,
      tokenB: tokenB3.address,
      xTokenA: oTokenA3.address,
      xTokenB: oTokenB3.address,
      swap: ADDRESSES.PancakeRouter,
      swapMaster: ADDRESSES.PancakeMasterV2,
      lpToken: LP3.address,
      poolID: 3,
      path: [
        [tokenA3.address, tokenB3.address],
        [oTokenA3.address, oTokenB3.address],
      ],
      pathTokenA2BNB: [tokenA3.address, tokenB3.address],
      pathTokenB2BNB: [oTokenA3.address, oTokenB3.address],
    });

    pairs.push({
      tokenA: tokenA4.address,
      tokenB: tokenB4.address,
      xTokenA: oTokenA4.address,
      xTokenB: oTokenB4.address,
      swap: ADDRESSES.PancakeRouter,
      swapMaster: ADDRESSES.PancakeMasterV2,
      lpToken: LP4.address,
      poolID: 4,
      path: [
        [tokenA4.address, tokenB4.address],
        [oTokenA4.address, oTokenB4.address],
      ],
      pathTokenA2BNB: [tokenA4.address, tokenB4.address],
      pathTokenB2BNB: [oTokenA4.address, oTokenB4.address],
    });

    pairs.push({
      tokenA: tokenA5.address,
      tokenB: tokenB5.address,
      xTokenA: oTokenA5.address,
      xTokenB: oTokenB5.address,
      swap: ADDRESSES.PancakeRouter,
      swapMaster: ADDRESSES.PancakeMasterV2,
      lpToken: LP5.address,
      poolID: 5,
      path: [
        [tokenA5.address, tokenB5.address],
        [oTokenA5.address, oTokenB5.address],
      ],
      pathTokenA2BNB: [tokenA5.address, tokenB5.address],
      pathTokenB2BNB: [oTokenA5.address, oTokenB5.address],
    });
  });

  describe("deployment", async () => {
    it("deploys strategy successfully", async () => {
      const address = await strategy.address;
      expect(address).to.be.not.eql(0x0);
      expect(address).to.be.not.eql("");
      expect(address).to.be.not.eql(null);
      expect(address).to.be.not.eql(undefined);
    });
  });

  describe("setFarmingPair", async () => {
    it("Only admin or owner can process", async () => {
      const tx = await expect(
        strategy.connect(other).setFarmingPairs(pairs)
      ).to.be.revertedWith("OA2");
    });

    it("Set 5 pairs", async () => {
      const tx = await strategy.connect(owner).setFarmingPairs(pairs);
    });

    it("getFarmingPair and check", async () => {
      const farmingPairs = await strategy.getFarmingPairs();

      expect(farmingPairs.length.toString()).to.be.eql(
        "5",
        "Total length is 5"
      );

      for (let index: number = 0; index < 5; index++) {
        expect(farmingPairs[index].tokenA).to.be.eql(
          pairs[index].tokenA,
          "Pair " + index + " - Token A"
        );
        expect(farmingPairs[index].tokenB).to.be.eql(
          pairs[index].tokenB,
          "Pair " + index + " - Token B"
        );
        expect(farmingPairs[index].lpToken).to.be.eql(
          pairs[index].lpToken,
          "Pair " + index + " - LP Token"
        );
        expect(farmingPairs[index].poolID.toString()).to.be.eql(
          pairs[index].poolID.toString(),
          "Pair " + index + " - PoolID"
        );
      }
    });
  });

  describe("deleteFarmingPairList", async () => {
    it("Only owner can call", async () => {
      await expect(
        strategy.connect(other).deleteFarmingPairList([2, 3])
      ).to.be.revertedWith("OA2");
    });

    it("Array length can be more than 5", async () => {
      await expect(
        strategy.connect(owner).deleteFarmingPairList([0, 1, 2, 3, 4, 5, 6, 7])
      ).to.be.revertedWith("F7");
    });

    it("delete index can't be out of range", async () => {
      await expect(
        strategy.connect(owner).deleteFarmingPairList([0, 1, 5, 2])
      ).to.be.revertedWith("F8");

      await expect(
        strategy.connect(owner).deleteFarmingPairList([0, 2, 5])
      ).to.be.revertedWith("F8");
    });

    it("delete indexes should be assoc sorted", async () => {
      await expect(
        strategy.connect(owner).deleteFarmingPairList([0, 1, 3, 2])
      ).to.be.revertedWith("F8");
    });

    it("delete indexes should not be duplicated", async () => {
      await expect(
        strategy.connect(owner).deleteFarmingPairList([0, 1, 1, 2])
      ).to.be.revertedWith("F8");
    });

    it("Delete [0, 2]", async () => {
      const tx = await strategy.connect(owner).deleteFarmingPairList([0, 2]);
    });

    it("getFarmingPair and check", async () => {
      const farmingPairs = await strategy.getFarmingPairs();

      expect(farmingPairs.length.toString()).to.be.eql(
        "3",
        "Total length is 3"
      );

      const arrCheck = [3, 1, 4];
      for (let index: number = 0; index < farmingPairs.length; index++) {
        expect(farmingPairs[index].tokenA).to.be.eql(
          pairs[arrCheck[index]].tokenA,
          "Pair " + index + " - Token A"
        );
        expect(farmingPairs[index].tokenB).to.be.eql(
          pairs[arrCheck[index]].tokenB,
          "Pair " + index + " - Token B"
        );
        expect(farmingPairs[index].lpToken).to.be.eql(
          pairs[arrCheck[index]].lpToken,
          "Pair " + index + " - LP Token"
        );
        expect(farmingPairs[index].poolID.toString()).to.be.eql(
          pairs[arrCheck[index]].poolID.toString(),
          "Pair " + index + " - PoolID"
        );
      }
    });

    it("Delete [2]", async () => {
      const tx = await strategy.connect(owner).deleteFarmingPairList([2]);
    });

    it("getFarmingPair and check", async () => {
      const farmingPairs = await strategy.getFarmingPairs();

      expect(farmingPairs.length.toString()).to.be.eql(
        "2",
        "Total length is 2"
      );

      const arrCheck = [3, 1];
      for (let index: number = 0; index < farmingPairs.length; index++) {
        expect(farmingPairs[index].tokenA).to.be.eql(
          pairs[arrCheck[index]].tokenA,
          "Pair " + index + " - Token A"
        );
        expect(farmingPairs[index].tokenB).to.be.eql(
          pairs[arrCheck[index]].tokenB,
          "Pair " + index + " - Token B"
        );
        expect(farmingPairs[index].lpToken).to.be.eql(
          pairs[arrCheck[index]].lpToken,
          "Pair " + index + " - LP Token"
        );
        expect(farmingPairs[index].poolID.toString()).to.be.eql(
          pairs[arrCheck[index]].poolID.toString(),
          "Pair " + index + " - PoolID"
        );
      }
    });

    it("Delete all [0,1]", async () => {
      const tx = await strategy.connect(owner).deleteFarmingPairList([0, 1]);
    });

    it("getFarmingPair and check", async () => {
      const farmingPairs = await strategy.getFarmingPairs();

      expect(farmingPairs.length.toString()).to.be.eql(
        "0",
        "Total length is 0"
      );
    });
  });

  describe("Reset", async () => {
    it("Set 5 pairs", async () => {
      const tx = await strategy.connect(owner).setFarmingPairs(pairs);
      const farmingPairs = await strategy.getFarmingPairs();
      expect(farmingPairs.length.toString()).to.be.eql(
        "5",
        "Total length is 5"
      );
    });

    it("Delete [1, 3]", async () => {
      const tx = await strategy.connect(owner).deleteFarmingPairList([1, 3]);
      const farmingPairs = await strategy.getFarmingPairs();
      expect(farmingPairs.length.toString()).to.be.eql(
        "3",
        "Total length is 3"
      );
    });

    it("Reset 4 pairs", async () => {
      const tx = await strategy
        .connect(owner)
        .setFarmingPairs([pairs[1], pairs[4], pairs[2], pairs[0]]);
    });

    it("Check reset", async () => {
      const farmingPairs = await strategy.getFarmingPairs();

      expect(farmingPairs.length.toString()).to.be.eql(
        "4",
        "Total length is 4"
      );

      const arrCheck = [1, 4, 2, 0];
      for (let index: number = 0; index < farmingPairs.length; index++) {
        expect(farmingPairs[index].tokenA).to.be.eql(
          pairs[arrCheck[index]].tokenA,
          "Pair " + index + " - Token A"
        );
        expect(farmingPairs[index].tokenB).to.be.eql(
          pairs[arrCheck[index]].tokenB,
          "Pair " + index + " - Token B"
        );
        expect(farmingPairs[index].lpToken).to.be.eql(
          pairs[arrCheck[index]].lpToken,
          "Pair " + index + " - LP Token"
        );
        expect(farmingPairs[index].poolID.toString()).to.be.eql(
          pairs[arrCheck[index]].poolID.toString(),
          "Pair " + index + " - PoolID"
        );
      }
    });

    it("Delete all [0, 1, 2, 3]", async () => {
      const tx = await strategy
        .connect(owner)
        .deleteFarmingPairList([0, 1, 2, 3]);
      const farmingPairs = await strategy.getFarmingPairs();
      expect(farmingPairs.length.toString()).to.be.eql(
        "0",
        "Total length is 0"
      );
    });
  });
};