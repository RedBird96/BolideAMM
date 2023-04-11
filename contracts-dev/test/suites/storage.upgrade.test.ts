/*******************************************
 * Test on Hardhat
 * owner, other should have at least 5 balance of USDT, BUSD, LINK
 *******************************************/

import {ethers, upgrades} from "hardhat";
import {
  ERC20,
  StorageV2Test,
  StorageV3,
  AggregatorN3,
  MultiLogic,
} from "../../typechain-types";
import {logValue} from "../../utils/helpers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {expect, assert} from "chai";
import {BigNumber} from "ethers";

const USDT_1 = ethers.utils.parseEther("1"); // USDT
const USDT_2 = ethers.utils.parseEther("3"); // USDT
const BUSD_1 = ethers.utils.parseEther("2"); // USDT
const BUSD_2 = ethers.utils.parseEther("4"); // USDT
const LINK_1 = ethers.utils.parseEther("10"); // USDT
const LINK_2 = ethers.utils.parseEther("20"); // USDT

export const storage_upgrade = () => {
  let BLID: ERC20,
    USDT: ERC20,
    BUSD: ERC20,
    LINK: ERC20,
    aggregator: AggregatorN3,
    multiLogicProxy: MultiLogic,
    storage2: StorageV2Test,
    storage3: StorageV3,
    owner: SignerWithAddress,
    other: SignerWithAddress,
    expense: SignerWithAddress,
    logicContract: SignerWithAddress,
    accumulatedDepositor: SignerWithAddress;

  before(async () => {
    [owner, other, expense, logicContract, accumulatedDepositor] =
      await ethers.getSigners();

    const AGGGREGATOR_FACTORY = await ethers.getContractFactory(
      "AggregatorN3",
      owner
    );
    const USDT_FACTORY = await ethers.getContractFactory("ERC20", owner);
    const BUSD_FACTORY = await ethers.getContractFactory("ERC20", owner);
    const LINK_FACTORY = await ethers.getContractFactory("ERC20", owner);
    const BLID_FACTORY = await ethers.getContractFactory("ERC20", owner);

    aggregator = (await AGGGREGATOR_FACTORY.deploy()) as AggregatorN3;
    BLID = (await BLID_FACTORY.deploy(
      "some erc20 as if BLID",
      "SERC"
    )) as ERC20;
    USDT = (await USDT_FACTORY.deploy("some erc20 as USDT", "USDT")) as ERC20;
    BUSD = (await BUSD_FACTORY.deploy("some erc20 as BUSD", "BUSD")) as ERC20;
    LINK = (await LINK_FACTORY.deploy("some erc20 as Link", "LINK")) as ERC20;
  });

  before(async () => {
    await USDT.connect(owner).transfer(
      other.address,
      ethers.utils.parseEther("100")
    );
    await USDT.connect(owner).transfer(
      accumulatedDepositor.address,
      ethers.utils.parseEther("100")
    );
    await BUSD.connect(owner).transfer(
      other.address,
      ethers.utils.parseEther("100")
    );
    await LINK.connect(owner).transfer(
      other.address,
      ethers.utils.parseEther("100")
    );
  });

  describe("StorageV2Test", async () => {
    before(async () => {
      const STORAGEV2_FACTORY = await ethers.getContractFactory(
        "StorageV2Test",
        owner
      );

      storage2 = (await upgrades.deployProxy(
        STORAGEV2_FACTORY,
        [logicContract.address],
        {
          initializer: "initialize",
        }
      )) as StorageV2Test;
      await storage2.deployed();

      let tx;
      tx = await storage2.connect(owner).setBLID(BLID.address);
      await tx.wait(1);
    });

    describe("Approve USDT, BUSD to Storage", async () => {
      it("Approve USDT_1", async () => {
        const tx = await USDT.connect(owner).approve(storage2.address, USDT_1);
        await tx.wait(1);
      });

      it("Approve USDT_2", async () => {
        const tx = await USDT.connect(other).approve(storage2.address, USDT_2);
        await tx.wait(1);
      });

      it("Approve BUSD_1", async () => {
        const tx = await BUSD.connect(owner).approve(storage2.address, BUSD_1);
        await tx.wait(1);
      });

      it("Approve BUSD_2", async () => {
        const tx = await BUSD.connect(other).approve(storage2.address, BUSD_2);
        await tx.wait(1);
      });

      it("Approve LINK_1", async () => {
        const tx = await LINK.connect(owner).approve(storage2.address, LINK_1);
        await tx.wait(1);
      });

      it("Approve LINK_2", async () => {
        const tx = await LINK.connect(other).approve(storage2.address, LINK_2);
        await tx.wait(1);
      });
    });

    describe("Deposit USDT, BUSD to Storage", async () => {
      it("add tokens", async () => {
        await storage2
          .connect(owner)
          .addToken(USDT.address, aggregator.address);
        await storage2
          .connect(owner)
          .addToken(BUSD.address, aggregator.address);
        await storage2
          .connect(owner)
          .addToken(LINK.address, aggregator.address);
      });

      it("Deposit USDT_1", async () => {
        const tx = await storage2.connect(owner).deposit(USDT_1, USDT.address);
        await tx.wait(1);
      });

      it("Deposit USDT_2", async () => {
        const tx = await storage2.connect(other).deposit(USDT_2, USDT.address);
        await tx.wait(1);
      });

      it("Deposit BUSD_1", async () => {
        const tx = await storage2.connect(owner).deposit(BUSD_1, BUSD.address);
        await tx.wait(1);
      });

      it("Deposit BUSD_2", async () => {
        const tx = await storage2.connect(other).deposit(BUSD_2, BUSD.address);
        await tx.wait(1);
      });

      it("Deposit LINK_1", async () => {
        const tx = await storage2.connect(owner).deposit(LINK_1, LINK.address);
        await tx.wait(1);
      });

      it("Deposit LINK_2", async () => {
        const tx = await storage2.connect(other).deposit(LINK_2, LINK.address);
        await tx.wait(1);
      });
    });

    describe("Validation after deposit", async () => {
      it("Used Token", async () => {
        assert.equal(
          await storage2._isUsedToken(USDT.address),
          true,
          "USDT is used"
        );
        assert.equal(
          await storage2._isUsedToken(BUSD.address),
          true,
          "BUSD is used"
        );
        assert.equal(
          await storage2._isUsedToken(LINK.address),
          true,
          "LINK is used"
        );
        assert.equal(
          await storage2._isUsedToken(owner.address),
          false,
          "Other token is never used"
        );
      });

      it("USDT", async () => {
        let balance;
        balance = await storage2.getTokenBalance(USDT.address);
        assert.equal(
          balance.toString(),
          USDT_1.add(USDT_2).toString(),
          "USDT total balance"
        );

        balance = await storage2.getTokenDeposited(USDT.address);
        assert.equal(
          balance.toString(),
          USDT_1.add(USDT_2).toString(),
          "USDT deposited"
        );

        balance = await storage2.getTokenDeposit(owner.address, USDT.address);
        assert.equal(balance.toString(), USDT_1.toString(), "USDT_1 deposit");

        balance = await storage2.getTokenDeposit(other.address, USDT.address);
        assert.equal(balance.toString(), USDT_2.toString(), "USDT_2 deposit");
      });

      it("BUSD", async () => {
        let balance;
        balance = await storage2.getTokenBalance(BUSD.address);
        assert.equal(
          balance.toString(),
          BUSD_1.add(BUSD_2).toString(),
          "BUSD total balance"
        );

        balance = await storage2.getTokenDeposited(BUSD.address);
        assert.equal(
          balance.toString(),
          BUSD_1.add(BUSD_2).toString(),
          "BUSD deposited"
        );

        balance = await storage2.getTokenDeposit(owner.address, BUSD.address);
        assert.equal(balance.toString(), BUSD_1.toString(), "BUSD_1 deposit");

        balance = await storage2.getTokenDeposit(other.address, BUSD.address);
        assert.equal(balance.toString(), BUSD_2.toString(), "BUSD_2 deposit");
      });

      it("LINK", async () => {
        let balance;
        balance = await storage2.getTokenBalance(LINK.address);
        assert.equal(
          balance.toString(),
          LINK_1.add(LINK_2).toString(),
          "LINK total balance"
        );

        balance = await storage2.getTokenDeposited(LINK.address);
        assert.equal(
          balance.toString(),
          LINK_1.add(LINK_2).toString(),
          "LINK deposited"
        );

        balance = await storage2.getTokenDeposit(owner.address, LINK.address);
        assert.equal(balance.toString(), LINK_1.toString(), "LINK_1 deposit");

        balance = await storage2.getTokenDeposit(other.address, LINK.address);
        assert.equal(balance.toString(), LINK_2.toString(), "LINK_2 deposit");
      });

      it("Deposit by user", async () => {
        let balance;
        balance = await storage2.balanceOf(owner.address);
        assert.equal(
          balance.toString(),
          USDT_1.add(BUSD_1).add(LINK_1).toString(),
          "Total deposit 1"
        );

        balance = await storage2.balanceOf(other.address);
        assert.equal(
          balance.toString(),
          USDT_2.add(BUSD_2).add(LINK_2).toString(),
          "Total deposit 2"
        );

        balance = await storage2.getTotalDeposit();
        assert.equal(
          balance.toString(),
          USDT_1.add(BUSD_1)
            .add(LINK_1)
            .add(USDT_2)
            .add(BUSD_2)
            .add(LINK_2)
            .toString(),
          "Total deposit"
        );
      });
    });
  });

  describe("StorageV3", async () => {
    describe("Deployment", async () => {
      it("Upgrade to StorageV3", async () => {
        const STORAGEV3_FACTORY = await ethers.getContractFactory(
          "StorageV3",
          owner
        );
        storage3 = (await upgrades.upgradeProxy(
          storage2.address,
          STORAGEV3_FACTORY
        )) as StorageV3;
        await storage3.deployed();
      });

      it("Set Expense address", async () => {
        const tx = await storage3
          .connect(owner)
          .setBoostingAddress(expense.address);
        await tx.wait();
      });

      it("MultiLogicProxy", async () => {
        const MULTILOGICPROXY_FACTORY = await ethers.getContractFactory(
          "MultiLogic",
          owner
        );
        multiLogicProxy = (await upgrades.deployProxy(
          MULTILOGICPROXY_FACTORY,
          [],
          {
            kind: "uups",
            initializer: "__MultiLogicProxy_init",
          }
        )) as MultiLogic;
        await multiLogicProxy.deployed();

        let tx;
        tx = await storage3
          .connect(owner)
          .setMultiLogicProxy(multiLogicProxy.address);
        await tx.wait(1);

        tx = await multiLogicProxy.connect(owner).setStorage(storage3.address);
        await tx.wait(1);

        tx = await multiLogicProxy.connect(owner).initStrategies(
          ["LBF", "LBL"],
          [
          {
            logicContract: BLID.address,
            strategyContract: USDT.address,
          },
          {
            logicContract: BUSD.address,
            strategyContract: LINK.address,
          },
        ]);
        await tx.wait(1);

        tx = await multiLogicProxy
          .connect(owner)
          .setPercentages(USDT.address, [7000, 3000]);
        await tx.wait(1);

        tx = await multiLogicProxy
          .connect(owner)
          .setPercentages(BUSD.address, [7000, 3000]);
        await tx.wait(1);

        tx = await multiLogicProxy
          .connect(owner)
          .setPercentages(LINK.address, [7000, 3000]);
        await tx.wait(1);
      });
    });

    describe("Validation after upgrade", async () => {
      it("Used Token", async () => {
        assert.equal(
          await storage3._isUsedToken(USDT.address),
          true,
          "USDT is used"
        );
        assert.equal(
          await storage3._isUsedToken(BUSD.address),
          true,
          "BUSD is used"
        );
        assert.equal(
          await storage3._isUsedToken(LINK.address),
          true,
          "LINK is used"
        );
        assert.equal(
          await storage3._isUsedToken(owner.address),
          false,
          "Other token is never used"
        );

        const arrUsedToken = await storage3.connect(owner).getUsedTokens();
        assert.equal(arrUsedToken.length, 3, "3 Tokens are used");
      });

      it("USDT", async () => {
        let balance;
        balance = await storage3.getTokenBalance(USDT.address);
        assert.equal(
          balance.toString(),
          USDT_1.add(USDT_2).toString(),
          "USDT total balance"
        );

        balance = await storage3.getTokenDeposited(USDT.address);
        assert.equal(
          balance.toString(),
          USDT_1.add(USDT_2).toString(),
          "USDT deposited"
        );

        balance = await storage3.getTokenDeposit(owner.address, USDT.address);
        assert.equal(balance.toString(), USDT_1.toString(), "USDT_1 deposit");

        balance = await storage3.getTokenDeposit(other.address, USDT.address);
        assert.equal(balance.toString(), USDT_2.toString(), "USDT_2 deposit");
      });

      it("BUSD", async () => {
        let balance;
        balance = await storage3.getTokenBalance(BUSD.address);
        assert.equal(
          balance.toString(),
          BUSD_1.add(BUSD_2).toString(),
          "BUSD total balance"
        );

        balance = await storage3.getTokenDeposited(BUSD.address);
        assert.equal(
          balance.toString(),
          BUSD_1.add(BUSD_2).toString(),
          "BUSD deposited"
        );

        balance = await storage3.getTokenDeposit(owner.address, BUSD.address);
        assert.equal(balance.toString(), BUSD_1.toString(), "BUSD_1 deposit");

        balance = await storage3.getTokenDeposit(other.address, BUSD.address);
        assert.equal(balance.toString(), BUSD_2.toString(), "BUSD_2 deposit");
      });

      it("LINK", async () => {
        let balance;
        balance = await storage3.getTokenBalance(LINK.address);
        assert.equal(
          balance.toString(),
          LINK_1.add(LINK_2).toString(),
          "LINK total balance"
        );

        balance = await storage3.getTokenDeposited(LINK.address);
        assert.equal(
          balance.toString(),
          LINK_1.add(LINK_2).toString(),
          "LINK deposited"
        );

        balance = await storage3.getTokenDeposit(owner.address, LINK.address);
        assert.equal(balance.toString(), LINK_1.toString(), "LINK_1 deposit");

        balance = await storage3.getTokenDeposit(other.address, LINK.address);
        assert.equal(balance.toString(), LINK_2.toString(), "LINK_2 deposit");
      });

      it("Deposit by user", async () => {
        let balance;
        balance = await storage3.balanceOf(owner.address);
        assert.equal(
          balance.toString(),
          USDT_1.add(BUSD_1).add(LINK_1).toString(),
          "Total deposit 1"
        );

        balance = await storage3.balanceOf(other.address);
        assert.equal(
          balance.toString(),
          USDT_2.add(BUSD_2).add(LINK_2).toString(),
          "Total deposit 2"
        );

        balance = await storage3.getTotalDeposit();
        assert.equal(
          balance.toString(),
          USDT_1.add(BUSD_1)
            .add(LINK_1)
            .add(USDT_2)
            .add(BUSD_2)
            .add(LINK_2)
            .toString(),
          "Total deposit"
        );
      });
    });

    describe("Versionable", async () => {
      it("Only owner can set version", async () => {
        const tx = await expect(
          storage3.connect(other).upgradeVersion("1.0.0", "init")
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Version can't be empty", async () => {
        const tx = await expect(
          storage3.connect(owner).upgradeVersion("", "init")
        ).to.be.revertedWith("OV1");
      });

      it("Set version 1.0.0, purpose", async () => {
        const tx = await storage3
          .connect(owner)
          .upgradeVersion("1.0.0", "init");
        await tx.wait(1);

        const version = await storage3.connect(owner).getVersion();
        expect(version).to.be.eql("1.0.0");

        const purpose = await storage3.connect(owner).getPurpose();
        expect(purpose).to.be.eql("init");
      });
    });

    describe("DepositOnBehalf", async () => {
      it("Set AccumulatedDepositor", async () => {
        const tx = await storage3
          .connect(owner)
          .setAccumulatedDepositor(accumulatedDepositor.address);
      });

      it("Approve Storage", async () => {
        const tx = await USDT.connect(accumulatedDepositor).approve(
          storage3.address,
          ethers.utils.parseEther("1000000")
        );
        await tx.wait(1);
      });

      it("Deposit USDT for other", async () => {
        const tx = await storage3
          .connect(accumulatedDepositor)
          .depositOnBehalf(USDT_1.toString(), USDT.address, other.address);
        await tx.wait(1);

        let balance: BigNumber;
        balance = await storage3.getTokenDeposited(USDT.address);
        assert.equal(
          balance.toString(),
          USDT_1.add(USDT_2).add(USDT_1).toString(),
          "USDT Total deposit"
        );

        balance = await storage3.getTokenDeposit(other.address, USDT.address);
        assert.equal(
          balance.toString(),
          USDT_1.add(USDT_2).toString(),
          "USDT for other"
        );
      });
    });

    describe("Withdraw", async () => {
      it("Withdraw USDT, BUSD, LINK", async () => {
        let tx;
        tx = await storage3.connect(owner).withdraw(USDT_1, USDT.address);
        await tx.wait(1);
        tx = await storage3
          .connect(other)
          .withdraw(USDT_2.add(USDT_1), USDT.address);
        await tx.wait(1);
        tx = await storage3.connect(owner).withdraw(BUSD_1, BUSD.address);
        await tx.wait(1);
        tx = await storage3.connect(other).withdraw(BUSD_2, BUSD.address);
        await tx.wait(1);
        tx = await storage3.connect(owner).withdraw(LINK_1, LINK.address);
        await tx.wait(1);
        tx = await storage3.connect(other).withdraw(LINK_2, LINK.address);
        await tx.wait(1);
      });

      after(async () => {
        logValue(
          "Storage deposit of owner",
          await storage3.balanceOf(owner.address)
        );
        logValue("Storage deposit total", await storage3.getTotalDeposit());
        logValue(
          "Storage token of owner",
          await storage3.getTokenDeposit(owner.address, USDT.address)
        );
        logValue(
          "Storage token total",
          await storage3.getTokenBalance(USDT.address)
        );
      });
    });
  });
};
