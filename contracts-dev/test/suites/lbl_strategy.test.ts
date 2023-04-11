/*******************************************
 * Test on BSC Mainnet
 * Before run test, deploy storage, logic, aggregator contract on mainnet
 *******************************************/

import dotenv from "dotenv";
import {ethers} from "hardhat";
import {expect, assert} from "chai";
import {cErcAbi} from "../../data/contracts_abi/compound.json";
import {erc20Abi} from "../../data/contracts_abi/erc20.json";
import {
  StorageV3,
  StorageV3__factory,
  Logic,
  Logic__factory,
  LendBorrowLendStrategy,
  LendBorrowLendStrategy__factory,
  MultiLogic,
  MultiLogic__factory,
} from "../../typechain-types";
import {ADDRESS_COLLECTION, PLATFORM} from "../../data/addresses.json";
import {sleep, logValue} from "../../utils/helpers";
import {BigNumber} from "ethers";

dotenv.config();

const provider = new ethers.providers.JsonRpcProvider(
  process.env.MAINNET_BSC_PROVIDER_URL,
  {name: "binance", chainId: 56}
);

// Load Addresses
const ADDRESSES = ADDRESS_COLLECTION.bsc;
const platform = PLATFORM["bsc"];
const blidAddress = platform.blid;
const expenseAddress = platform.expenses;

// Your Ethereum wallet private key
const owner = process.env.PRIVATE_KEY
  ? new ethers.Wallet(process.env.PRIVATE_KEY!, provider)
  : ethers.Wallet.createRandom();
const other = process.env.PRIVATE_KEY_TEST
  ? new ethers.Wallet(process.env.PRIVATE_KEY_TEST!, provider)
  : ethers.Wallet.createRandom();

// Mainnet deployed Contract address
const lbfLogicAddress = process.env.LBF_LOGIC_PROXY_ADDRESS!;
const lbfStrategyAddress = process.env.LBF_STRATEGY_PROXY_ADDRESS!;
const lblLogicAddress = process.env.LBL_LOGIC_PROXY_ADDRESS!;
const lblStrategyAddress = process.env.LBL_STRATEGY_PROXY_ADDRESS!;
const storageAddress = process.env.STORAGE_PROXY_ADDRESS!;
const multiLogicProxyAddress = process.env.MULTILOGIC_PROXY_ADDRESS!;

// Initialize Contract
const USDT = new ethers.Contract(
  ADDRESSES.Token.USDT.Underlying,
  erc20Abi,
  owner
);
const BUSD = new ethers.Contract(
  ADDRESSES.Token.BUSD.Underlying,
  erc20Abi,
  owner
);
const oUSDT = new ethers.Contract(ADDRESSES.Token.USDT.Ola, cErcAbi, owner);
const oBUSD = new ethers.Contract(ADDRESSES.Token.BUSD.Ola, cErcAbi, owner);
const BANANA = new ethers.Contract(
  ADDRESSES.Token.BANANA.Underlying,
  erc20Abi,
  owner
);
const BLID = new ethers.Contract(blidAddress, erc20Abi, owner);

// Variables for deployed contract
let storage: StorageV3,
  lblStrategy: LendBorrowLendStrategy,
  logic: Logic,
  multiLogicProxy: MultiLogic;

// Testing Value
const amountDepositToStorage: BigNumber = ethers.utils.parseEther("0.01"); // USDT
const amountTakeFromStorage: BigNumber = ethers.utils.parseEther("0.007"); // USDT
const amountWithdrawFromStorage: BigNumber = ethers.utils.parseEther("0.001"); // USDT
const minimumBLIDPerRewardToken: BigNumber = BigNumber.from("10");

require("chai").use(require("chai-as-promised")).should();

export const lbl_strategy = () => {
  before(async () => {
    logic = Logic__factory.connect(lblLogicAddress, owner);

    lblStrategy = LendBorrowLendStrategy__factory.connect(
      lblStrategyAddress,
      owner
    );

    storage = StorageV3__factory.connect(storageAddress, owner);

    multiLogicProxy = MultiLogic__factory.connect(
      multiLogicProxyAddress,
      owner
    ) as MultiLogic;
  });

  describe("Preparation", async () => {
    xdescribe("MuliLogicProxy", async () => {
      it("Set Strategy address", async () => {
        const multiStrategyLength =
          (await multiLogicProxy.multiStrategyLength()) as BigNumber;

        if (multiStrategyLength.eq(0)) {
          const tx = await multiLogicProxy.connect(owner).initStrategies(
            ["LBF", "LBL"],
            [
              {
                logicContract: lblLogicAddress,
                strategyContract: lblStrategyAddress,
              },
              {
                logicContract: lbfLogicAddress,
                strategyContract: lbfStrategyAddress,
              },
            ]
          );
          await tx.wait(1);
        } else {
          const tx = await multiLogicProxy.connect(owner).addStrategy(
            "LBF",
            {
              logicContract: lblLogicAddress,
              strategyContract: lblStrategyAddress,
            },
            true
          );
          await tx.wait(1);
        }
      });

      it("Set Percentages USDT", async () => {
        const tx = await multiLogicProxy
          .connect(owner)
          .setPercentages(USDT.address, [7000, 3000]);
        await tx.wait(1);
      });

      it("Set Percentages BUSD", async () => {
        await multiLogicProxy
          .connect(owner)
          .setPercentages(BUSD.address, [7000, 3000]);
      });
    });

    xdescribe("Set pathToSwapRewardsToBLID", async () => {
      it("Length of pathToSwapRewardsToBLID should be more than 2", async () => {
        const tx = await lblStrategy
          .connect(owner)
          .setPathToSwapRewardsToBLID([USDT.address])
          .should.be.revertedWith("L6");
      });

      it("pathToSwapRewardsToBLID should start with BANANA token", async () => {
        const tx = await lblStrategy
          .connect(owner)
          .setPathToSwapRewardsToBLID([USDT.address, BLID.address])
          .should.be.revertedWith("L7");
      });

      it("pathToSwapRewardsToBLID should end with BLID token", async () => {
        const tx = await lblStrategy
          .connect(owner)
          .setPathToSwapRewardsToBLID([
            ADDRESSES.Token.BANANA.Underlying,
            USDT.address,
          ])
          .should.be.revertedWith("L8");
      });

      it("Set pathToSwapRewardsToBLID as BANANA-BNB-USDT-BLID", async () => {
        const tx = await lblStrategy
          .connect(owner)
          .setPathToSwapRewardsToBLID([
            ADDRESSES.Token.BANANA.Underlying,
            ADDRESSES.Token.BNB.Underlying,
            ADDRESSES.Token.USDT.Underlying,
            BLID.address,
          ]);
        await tx.wait(1);
      });

      it("Set pathToSwapRewardsToBLID as BANANA-BNB-BUSD-BLID", async () => {
        const tx = await lblStrategy
          .connect(owner)
          .setPathToSwapRewardsToBLID([
            ADDRESSES.Token.BANANA.Underlying,
            ADDRESSES.Token.BNB.Underlying,
            ADDRESSES.Token.BUSD.Underlying,
            BLID.address,
          ]);
        await tx.wait(1);
      });
    });

    describe("Set avoidLiquidationFactor", async () => {
      it("Set USDT avoidLiquidationFactor as 2", async () => {
        const tx = await lblStrategy
          .connect(owner)
          .setAvoidLiquidationFactor(2, USDT.address);
        await tx.wait(1);

        const avoidLiquidationfactor = await lblStrategy
          .connect(owner)
          .avoidLiquidationFactorTokens(USDT.address);
        expect(avoidLiquidationfactor).to.be.eql(
          2,
          "avoidLiquidationfactor should be 2"
        );
      });
      it("Set BUSD avoidLiquidationFactor as 3", async () => {
        const tx = await lblStrategy
          .connect(owner)
          .setAvoidLiquidationFactor(3, BUSD.address);
        await tx.wait(1);

        const avoidLiquidationfactor = await lblStrategy
          .connect(owner)
          .avoidLiquidationFactorTokens(BUSD.address);
        expect(avoidLiquidationfactor).to.be.eql(
          2,
          "avoidLiquidationfactor should be 3"
        );
      });
    });

    describe("Init Circle", async () => {
      it("Only owner can init circle", async () => {
        const tx = await lblStrategy
          .connect(other)
          .init(USDT.address, oUSDT.address)
          .should.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Init with USDT/oUSDT", async () => {
        let tx;
        tx = await lblStrategy.connect(owner).init(USDT.address, oUSDT.address);
        await tx.wait(1);
      });

      it("Cannot init with USDT/oUSDT again", async () => {
        const tx = await lblStrategy
          .connect(owner)
          .init(USDT.address, oUSDT.address)
          .should.be.revertedWith("L10");
      });

      it("Init with BUSD/oBUSD", async () => {
        let tx;
        tx = await lblStrategy.connect(owner).init(BUSD.address, oBUSD.address);
        await tx.wait(1);
      });
    });
  });

  describe("Deposit USDT && BUSD to Storage", async () => {
    before(async () => {
      logValue("USDT balance", await USDT.balanceOf(owner.address));
      logValue("BUSD balance", await BUSD.balanceOf(owner.address));
    });

    xit("Add token underlying(USDT) to storage", async () => {
      const tx = await storage
        .connect(owner)
        .addToken(USDT.address, ADDRESSES.CHAINLINK.USDT);
      await tx.wait(1);
    });

    xit("Add token underlying(BUSD) to storage", async () => {
      const tx = await storage
        .connect(owner)
        .addToken(BUSD.address, ADDRESSES.CHAINLINK.BUSD);
      await tx.wait(1);
    });

    it(
      "Approve " + amountDepositToStorage + " for storage on underlying(USDT)",
      async () => {
        const tx = await USDT.connect(owner).approve(
          storage.address,
          amountDepositToStorage
        );
        await tx.wait(1);
      }
    );

    it(
      "Approve " + amountDepositToStorage + " for storage on underlying(BUSD)",
      async () => {
        const tx = await BUSD.connect(owner).approve(
          storage.address,
          amountDepositToStorage
        );
        await tx.wait(1);
      }
    );

    it("Deposit " + amountDepositToStorage + " USDT from owner", async () => {
      const tx = await storage
        .connect(owner)
        .deposit(amountDepositToStorage, USDT.address);
      await tx.wait(1);
    });

    it("Deposit " + amountDepositToStorage + " BUSD from owner", async () => {
      const tx = await storage
        .connect(owner)
        .deposit(amountDepositToStorage, BUSD.address);
      await tx.wait(1);
    });
  });

  describe("Build", async () => {
    it("Only owner can set circlesCount", async () => {
      const tx = await lblStrategy
        .connect(other)
        .setCirclesCount(10, USDT.address)
        .should.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Set circlesCount to be 3 for USDT", async () => {
      const tx = await lblStrategy
        .connect(owner)
        .setCirclesCount(3, USDT.address);
      await tx.wait(6);

      const circlesCount = await lblStrategy
        .connect(owner)
        .circlesCountTokens(USDT.address);
      expect(circlesCount).to.be.eql(3, "CirclesCount should be 3");
    });

    it("Set circlesCount to be 5 for BUSD", async () => {
      const tx = await lblStrategy
        .connect(owner)
        .setCirclesCount(5, BUSD.address);
      await tx.wait(6);

      const circlesCount = await lblStrategy
        .connect(owner)
        .circlesCountTokens(BUSD.address);
      expect(circlesCount).to.be.eql(5, "CirclesCount should be 5");
    });

    it("Only owner can build circle", async () => {
      const tx = await lblStrategy
        .connect(other)
        .build(amountTakeFromStorage, USDT.address)
        .should.be.revertedWith("OA2");
    });

    it("Token should be inited", async () => {
      const tx = await lblStrategy
        .connect(owner)
        .build(amountTakeFromStorage, BANANA.address)
        .should.be.revertedWith("L2");
    });

    it("Cannot build with total deposit", async () => {
      await lblStrategy
        .connect(owner)
        .build(amountDepositToStorage, USDT.address)
        .should.be.revertedWith("M6");
    });

    it("Build circle for USDT", async () => {
      let tokenBalance = await storage.getTokenBalance(USDT.address);
      let balanceUSDTStorage = await USDT.balanceOf(storage.address);
      let balanceOUSDTLogic = await oUSDT.balanceOf(logic.address);
      let tx;
      tx = await lblStrategy
        .connect(owner)
        .build(amountTakeFromStorage, USDT.address);
      await tx.wait(1);

      let tokenBalanceNew = await storage.getTokenBalance(USDT.address);
      let balanceUSDTStorageNew = await USDT.balanceOf(storage.address);
      let balanceOUSDTLogicNew = await oUSDT.balanceOf(logic.address);

      assert.equal(
        tokenBalanceNew.add(amountTakeFromStorage).toString(),
        tokenBalance.toString(),
        "storage tokenBalance should be decreased"
      );
      assert.equal(
        balanceUSDTStorageNew.add(amountTakeFromStorage).toString(),
        balanceUSDTStorage.toString(),
        "USDT balance of storage should be decreased"
      );
      assert.equal(
        balanceOUSDTLogicNew.gt(balanceOUSDTLogic),
        true,
        "oUSDT balance of Logic should be increased"
      );
    });

    it("Build circle for BUSD", async () => {
      let tokenBalance = await storage.getTokenBalance(BUSD.address);
      let balanceBUSDStorage = await BUSD.balanceOf(storage.address);
      let balanceOBUSDLogic = await oBUSD.balanceOf(logic.address);
      let tx;
      tx = await lblStrategy
        .connect(owner)
        .build(amountTakeFromStorage, BUSD.address);
      await tx.wait(1);

      let tokenBalanceNew = await storage.getTokenBalance(BUSD.address);
      let balanceBUSDStorageNew = await BUSD.balanceOf(storage.address);
      let balanceOBUSDLogicNew = await oBUSD.balanceOf(logic.address);

      assert.equal(
        tokenBalanceNew.add(amountTakeFromStorage).toString(),
        tokenBalance.toString(),
        "storage tokenBalance should be decreased"
      );
      assert.equal(
        balanceBUSDStorageNew.add(amountTakeFromStorage).toString(),
        balanceBUSDStorage.toString(),
        "BUSD balance of storage should be decreased"
      );
      assert.equal(
        balanceOBUSDLogicNew.gt(balanceOBUSDLogic),
        true,
        "oBUSD balance of Logic should be increased"
      );
    });
  });

  describe("Claim", async () => {
    it("Only Owner or Admin can process Claim", async () => {
      const tx = await lblStrategy
        .connect(other)
        .claimRewards(USDT.address, minimumBLIDPerRewardToken)
        .should.be.revertedWith("OA2");
    });

    it("Token should be inited", async () => {
      const tx = await lblStrategy
        .connect(owner)
        .claimRewards(BANANA.address, minimumBLIDPerRewardToken)
        .should.be.revertedWith("OC2");
    });

    it("BILD award should be greater then expected", async () => {
      await lblStrategy
        .connect(other)
        .claimRewards(USDT.address, BigNumber.from(10000000000000000000000))
        .should.be.reverted;
    });

    it("Claim Rewards", async () => {
      await sleep(60000);
      let BLIDOwnerBalance = await storage.balanceEarnBLID(owner.address);
      let BLIDStorageBalance = await BLID.balanceOf(storage.address);
      let BLIDExpenseBalance = await BLID.balanceOf(expenseAddress);

      const tx = await lblStrategy
        .connect(owner)
        .claimRewards(USDT.address, minimumBLIDPerRewardToken);
      await tx.wait(1);

      let BLIDOwnerBalanceNew = await storage.balanceEarnBLID(owner.address);
      let BLIDStorageBalanceNew = await BLID.balanceOf(storage.address);
      let BLIDExpenseBalanceNew = await BLID.balanceOf(expenseAddress);

      assert.equal(
        BLIDOwnerBalanceNew.gt(BLIDOwnerBalance),
        true,
        "BLID balance of Owner should be increased"
      );
      assert.equal(
        BLIDStorageBalanceNew.gt(BLIDStorageBalance),
        true,
        "BLID balance of Storage should be increased"
      );
      assert.equal(
        BLIDExpenseBalanceNew.gt(BLIDExpenseBalance),
        true,
        "BLID balance of Expense should be increased"
      );
    });

    after(async () => {
      logValue("BLID Award", await storage.balanceEarnBLID(owner.address));
    });
  });

  xdescribe("Withdraw", async () => {
    it("Cannot withdraw over balance", async () => {
      await storage
        .connect(owner)
        .withdraw(amountDepositToStorage, USDT.address)
        .should.be.revertedWith("E4");
    });

    it("Withdraw 20% of USDT from storage", async () => {
      let USDTOwnerBalance = await USDT.balanceOf(owner.address);
      let USDTStorageBalance = await USDT.balanceOf(storage.address);
      let balanceOUSDTLogic = await oUSDT.balanceOf(logic.address);

      const tx = await storage
        .connect(owner)
        .withdraw(amountWithdrawFromStorage, USDT.address);
      await tx.wait(1);

      let USDTOwnerBalanceNew = await USDT.balanceOf(owner.address);
      let USDTStorageBalanceNew = await USDT.balanceOf(storage.address);
      let balanceOUSDTLogicNew = await oUSDT.balanceOf(logic.address);

      assert.equal(
        USDTOwnerBalance.add(amountWithdrawFromStorage).toString(),
        USDTOwnerBalanceNew.toString(),
        "USDT balance of Owner should be increased"
      );
      assert.equal(
        USDTStorageBalanceNew.toString(),
        0,
        "USDT balance of Storage should be 0"
      );
      assert.equal(
        balanceOUSDTLogicNew.lt(balanceOUSDTLogic),
        true,
        "oUSDT balance of Logic should be decreased"
      );
    });

    it("Cannot withdraw over balance", async () => {
      await storage
        .connect(owner)
        .withdraw(amountTakeFromStorage, USDT.address)
        .should.be.revertedWith(
          "REPAY_BORROW_NEW_ACCOUNT_BORROW_BALANCE_CALCULATION_FAILED"
        );
    });

    it("Withdraw 80% of USDT from storage", async () => {
      let amount: BigNumber = amountTakeFromStorage.sub(
        amountWithdrawFromStorage
      );
      let USDTOwnerBalance = await USDT.balanceOf(owner.address);
      let USDTStorageBalance = await USDT.balanceOf(storage.address);
      let balanceOUSDTLogic = await oUSDT.balanceOf(logic.address);

      let tx;

      tx = await storage.connect(owner).withdraw(amount, USDT.address);
      await tx.wait(1);

      let USDTOwnerBalanceNew = await USDT.balanceOf(owner.address);
      let USDTStorageBalanceNew = await USDT.balanceOf(storage.address);
      let balanceOUSDTLogicNew = await oUSDT.balanceOf(logic.address);

      assert.equal(
        USDTOwnerBalance.add(amount).toString(),
        USDTOwnerBalanceNew.toString(),
        "USDT balance of Owner should be increased"
      );
      assert.equal(
        USDTStorageBalanceNew.toString(),
        0,
        "USDT balance of Storage should be 0"
      );
      assert.equal(
        balanceOUSDTLogicNew.lt(balanceOUSDTLogic),
        true,
        "oUSDT balance of Logic should be decreased"
      );
    });

    it("Withdraw BUSD from storage", async () => {
      let amount: BigNumber = amountTakeFromStorage.sub(
        amountWithdrawFromStorage
      );
      let BUSDOwnerBalance = await BUSD.balanceOf(owner.address);
      let balanceOBUSDLogic = await oBUSD.balanceOf(logic.address);

      let tx;

      tx = await storage.connect(owner).withdraw(amount, BUSD.address);
      await tx.wait(1);

      let BUSDOwnerBalanceNew = await BUSD.balanceOf(owner.address);
      let balanceOBUSDLogicNew = await oBUSD.balanceOf(logic.address);

      assert.equal(
        BUSDOwnerBalance.add(amount).toString(),
        BUSDOwnerBalanceNew.toString(),
        "BUSD balance of Owner should be increased"
      );
      assert.equal(
        balanceOBUSDLogicNew.lt(balanceOBUSDLogic),
        true,
        "oBUSD balance of Logic should be decreased"
      );
    });
  });

  describe("Destroy", async () => {
    xit("Only owner can destroy", async () => {
      const tx = await lblStrategy
        .connect(other)
        .destroy(USDT.address)
        .should.be.revertedWith("OA2");
    });

    xit("Token should be inited", async () => {
      const tx = await lblStrategy
        .connect(owner)
        .destroy(BANANA.address)
        .should.be.revertedWith("L2");
    });

    it("Destroy circle for USDT", async () => {
      let tokenBalance = await storage.getTokenBalance(USDT.address);
      let balanceUSDTStorage = await USDT.balanceOf(storage.address);
      let balanceOUSDTLogic = await oUSDT.balanceOf(logic.address);

      const tx = await lblStrategy.connect(owner).destroy(USDT.address);
      await tx.wait(1);

      let tokenBalanceNew = await storage.getTokenBalance(USDT.address);
      let balanceUSDTStorageNew = await USDT.balanceOf(storage.address);
      let balanceOUSDTLogicNew = await oUSDT.balanceOf(logic.address);

      assert.equal(
        tokenBalance.add(amountTakeFromStorage).toString(),
        tokenBalanceNew.toString(),
        "storage tokenBalance should be increased"
      );
      assert.equal(
        balanceUSDTStorage.add(amountTakeFromStorage).toString(),
        balanceUSDTStorageNew.toString(),
        "USDT balance of storage should be increased"
      );
      assert.equal(
        balanceOUSDTLogicNew.lt(balanceOUSDTLogic),
        true,
        "oUSDT balance of Logic should be decreased"
      );
    });

    it("Destroy circle for BUSD", async () => {
      let tokenBalance = await storage.getTokenBalance(BUSD.address);
      let balanceBUSDStorage = await BUSD.balanceOf(storage.address);
      let balanceOBUSDLogic = await oBUSD.balanceOf(logic.address);

      const tx = await lblStrategy.connect(owner).destroy(BUSD.address);
      await tx.wait(1);

      let tokenBalanceNew = await storage.getTokenBalance(BUSD.address);
      let balanceBUSDStorageNew = await BUSD.balanceOf(storage.address);
      let balanceOBUSDLogicNew = await oBUSD.balanceOf(logic.address);

      assert.equal(
        tokenBalance.add(amountTakeFromStorage).toString(),
        tokenBalanceNew.toString(),
        "storage tokenBalance should be increased"
      );
      assert.equal(
        balanceBUSDStorage.add(amountTakeFromStorage).toString(),
        balanceBUSDStorageNew.toString(),
        "BUSD balance of storage should be increased"
      );
      assert.equal(
        balanceOBUSDLogicNew.lt(balanceOBUSDLogic),
        true,
        "oBUSD balance of Logic should be decreased"
      );
    });
  });

  xdescribe("Refund USDT && BUSD to owner", async () => {
    it("Withdraw deposit from Storage", async () => {
      const deposit = await storage.getTokenDeposit(
        owner.address,
        USDT.address
      );

      const tx = await storage.withdraw(deposit, USDT.address);
      await tx.wait(1);
    });

    it("Withdraw deposit from Storage", async () => {
      const deposit = await storage.getTokenDeposit(
        owner.address,
        BUSD.address
      );

      const tx = await storage.withdraw(deposit, BUSD.address);
      await tx.wait(1);
    });
  });
};
