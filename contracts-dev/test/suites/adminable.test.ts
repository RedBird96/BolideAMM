/*******************************************
 * Test on Hardhat
 ******************************************/

import dotenv from "dotenv";
import {ethers, upgrades} from "hardhat";
import {expect} from "chai";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ADDRESS_COLLECTION} from "../../data/addresses.json";
import {LendBorrowFarmStrategy} from "../../typechain-types";

dotenv.config();

const ADDRESSES = ADDRESS_COLLECTION.bscTestnet;

export const adminable = () => {
  let owner: SignerWithAddress,
    admin: SignerWithAddress,
    other: SignerWithAddress;
  let strategy: LendBorrowFarmStrategy;

  describe("Logic Contract", () => {
    before(async () => {
      [owner, admin, other] = await ethers.getSigners();
    });

    it("Contract deployment", async () => {
      const Strategy = await ethers.getContractFactory(
        "LendBorrowFarmStrategy"
      );
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
      const strategyAddress = strategy.address;

      expect(strategyAddress).to.be.not.eql(0x0);
      expect(strategyAddress).to.be.not.eql("");
      expect(strategyAddress).to.be.not.eql(null);
      expect(strategyAddress).to.be.not.eql(undefined);
    });

    it("Only owner can set admin", async () => {
      await expect(
        strategy.connect(other).setAdmin(admin.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Set admin by owner as `admin`", async () => {
      const tx = await strategy.connect(owner).setAdmin(admin.address);
    });

    it("Only `admin` can process deleteLastReserveLiquidity", async () => {
      await expect(
        strategy.connect(other).deleteLastReserveLiquidity()
      ).to.be.revertedWith("OA2");
      const tx = await strategy.connect(admin).addReserveLiquidity({
        tokenA: other.address,
        tokenB: other.address,
        xTokenA: other.address,
        xTokenB: other.address,
        swap: other.address,
        swapMaster: other.address,
        lpToken: other.address,
        poolID: 3,
        path: [
          [other.address, other.address],
          [other.address, other.address],
        ],
      });
    });

    it("Set admin by owner as `other`", async () => {
      const tx = await strategy.connect(owner).setAdmin(other.address);
    });

    it("Only `other` can process deleteLastReserveLiquidity", async () => {
      await expect(
        strategy.connect(admin).deleteLastReserveLiquidity()
      ).to.be.revertedWith("OA2");
      const tx = await strategy.connect(other).addReserveLiquidity({
        tokenA: other.address,
        tokenB: other.address,
        xTokenA: other.address,
        xTokenB: other.address,
        swap: other.address,
        swapMaster: other.address,
        lpToken: other.address,
        poolID: 3,
        path: [
          [other.address, other.address],
          [other.address, other.address],
        ],
      });
    });
  });
};
