/*******************************************
 * Test on Hardhat
 ******************************************/

import {ethers, upgrades} from "hardhat";
import {expect} from "chai";
import {Logic, StorageV3} from "../../typechain-types";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ADDRESS_COLLECTION} from "../../data/addresses.json";
// Load Addresses
const ADDRESSES = ADDRESS_COLLECTION.bscTestnet;

const expenseAddress = ethers.Wallet.createRandom().address;

export const versionable = () => {
  let owner: SignerWithAddress, other: SignerWithAddress;
  let logic: Logic, storage: StorageV3;
  let logicProxyAddress: string, storageProxyAddress: string;

  describe("Logic Contract", () => {
    before(async () => {
      [owner, other] = await ethers.getSigners();
    });

    it("First Proxy deployment", async () => {
      const Logic = await ethers.getContractFactory("Logic");
      logic = (await upgrades.deployProxy(
        Logic,
        [
          expenseAddress,
          ADDRESSES.VenusController,
          ADDRESSES.OlaController,
          ADDRESSES.OlaRainMaker,
          ADDRESSES.PancakeRouter,
          ADDRESSES.ApeswapRouter,
          ADDRESSES.BiswapRouter,
          ADDRESSES.PancakeMasterV2,
          ADDRESSES.ApeswapMaster,
          ADDRESSES.BiswapMaster,
        ],
        {
          kind: "uups",
          initializer: "__Logic_init",
        }
      )) as Logic;
      await logic.deployed();
      logicProxyAddress = logic.address;

      expect(logicProxyAddress).to.not.equal(0x0);
      expect(logicProxyAddress).to.not.equal("");
      expect(logicProxyAddress).to.not.equal(null);
      expect(logicProxyAddress).to.not.equal(undefined);
    });

    it("Only owner can set version", async () => {
      const tx = await expect(
        logic.connect(other).upgradeVersion("1.0.0", "init")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Version can't be empty", async () => {
      const tx = await expect(
        logic.connect(owner).upgradeVersion("", "init")
      ).to.be.revertedWith("OV1");
    });

    it("Set version 1.0.0, purpose", async () => {
      const tx = await logic.connect(owner).upgradeVersion("1.0.0", "init");
      await tx.wait(1);

      const version = await logic.connect(owner).getVersion();
      expect(version).to.be.eql("1.0.0");

      const purpose = await logic.connect(owner).getPurpose();
      expect(purpose).to.be.eql("init");
    });

    it("Upgrade deployment - 1", async () => {
      const Logic = await ethers.getContractFactory("Logic");
      logic = (await upgrades.upgradeProxy(logicProxyAddress, Logic)) as Logic;
      await logic.deployed();
    });

    it("Set version 1.0.1", async () => {
      let version = await logic.connect(owner).getVersion();
      expect(version).to.be.eql("1.0.0");

      let purpose = await logic.connect(owner).getPurpose();
      expect(purpose).to.be.eql("init");

      const tx = await logic.connect(owner).upgradeVersion("1.0.1", "Version1");
      await tx.wait(1);

      version = await logic.connect(owner).getVersion();
      expect(version).to.be.eql("1.0.1");

      purpose = await logic.connect(owner).getPurpose();
      expect(purpose).to.be.eql("Version1");
    });

    it("Upgrade deployment - 2", async () => {
      const Logic = await ethers.getContractFactory("Logic");
      logic = (await upgrades.upgradeProxy(logicProxyAddress, Logic)) as Logic;
      await logic.deployed();
    });

    it("Set version 1.0.2", async () => {
      let version = await logic.connect(owner).getVersion();
      expect(version).to.be.eql("1.0.1");

      let purpose = await logic.connect(owner).getPurpose();
      expect(purpose).to.be.eql("Version1");

      const tx = await logic.connect(owner).upgradeVersion("1.0.2", "Version2");
      await tx.wait(1);

      version = await logic.connect(owner).getVersion();
      expect(version).to.be.eql("1.0.2");

      purpose = await logic.connect(owner).getPurpose();
      expect(purpose).to.be.eql("Version2");
    });
  });

  describe("Storage Contract", () => {
    before(async () => {
      [owner, other] = await ethers.getSigners();
    });

    it("First Proxy deployment", async () => {
      const Storage = await ethers.getContractFactory("StorageV3");
      storage = (await upgrades.deployProxy(Storage, [])) as StorageV3;
      await storage.deployed();
      storageProxyAddress = storage.address;

      expect(storageProxyAddress).to.be.not.equal(0x0);
      expect(storageProxyAddress).to.be.not.equal("");
      expect(storageProxyAddress).to.be.not.equal(null);
      expect(storageProxyAddress).to.be.not.equal(undefined);
    });

    it("Only owner can set version", async () => {
      const tx = await expect(
        storage.connect(other).upgradeVersion("1.0.0", "init")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Version can't be empty", async () => {
      const tx = await expect(
        storage.connect(owner).upgradeVersion("", "init")
      ).to.be.revertedWith("OV1");
    });

    it("Set version 1.0.0, purpose", async () => {
      const tx = await storage.connect(owner).upgradeVersion("1.0.0", "init");
      await tx.wait(1);

      const version = await storage.connect(owner).getVersion();
      expect(version).to.be.eql("1.0.0");

      const purpose = await storage.connect(owner).getPurpose();
      expect(purpose).to.be.eql("init");
    });

    it("Upgrade deployment - 1", async () => {
      const Storage = await ethers.getContractFactory("StorageV3");
      storage = (await upgrades.upgradeProxy(
        storageProxyAddress,
        Storage
      )) as StorageV3;
      await storage.deployed();
    });

    it("Set version 1.0.1", async () => {
      let version = await storage.connect(owner).getVersion();
      expect(version).to.be.eql("1.0.0");

      let purpose = await storage.connect(owner).getPurpose();
      expect(purpose).to.be.eql("init");

      const tx = await storage
        .connect(owner)
        .upgradeVersion("1.0.1", "Version1");
      await tx.wait(1);

      version = await storage.connect(owner).getVersion();
      expect(version).to.be.eql("1.0.1");

      purpose = await storage.connect(owner).getPurpose();
      expect(purpose).to.be.eql("Version1");
    });

    it("Upgrade deployment - 2", async () => {
      const Storage = await ethers.getContractFactory("StorageV3");
      storage = (await upgrades.upgradeProxy(
        storageProxyAddress,
        Storage
      )) as StorageV3;
      await storage.deployed();
    });

    it("Set version 1.0.2", async () => {
      let version = await storage.connect(owner).getVersion();
      expect(version).to.be.eql("1.0.1");

      let purpose = await storage.connect(owner).getPurpose();
      expect(purpose).to.be.eql("Version1");

      const tx = await storage
        .connect(owner)
        .upgradeVersion("1.0.2", "Version2");
      await tx.wait(1);

      version = await storage.connect(owner).getVersion();
      expect(version).to.be.eql("1.0.2");

      purpose = await storage.connect(owner).getPurpose();
      expect(purpose).to.be.eql("Version2");
    });
  });
};
