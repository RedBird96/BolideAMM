/*******************************************
 * Test on BSC Mainnet
 * Before run test, deploy storage, logic, aggregator contract on mainnet
 * Owner should have at least 1 USDT
 *******************************************/

import dotenv from "dotenv";
import {
  cEthAbi,
  cErcAbi,
  erc20Abi,
  masterChefAbi,
} from "../../data/contracts_abi.json";
import {
  StorageV3,
  Logic,
  StorageV3__factory,
  Logic__factory,
  LendBorrowFarmStrategy,
  LendBorrowFarmStrategy__factory,
  MultiLogic,
  MultiLogic__factory,
} from "../../typechain-types";
import {ethers} from "hardhat";
import {expect} from "chai";
import {time} from "@openzeppelin/test-helpers";
import {logValue} from "../../utils/helpers";
import {ADDRESS_COLLECTION} from "../../data/addresses.json";
import {BigNumber} from "ethers";
import {text} from "stream/consumers";

dotenv.config();

const provider = new ethers.providers.JsonRpcProvider(
  process.env.MAINNET_BSC_PROVIDER_URL,
  {name: "binance", chainId: 56}
);

// Load Addresses
const ADDRESSES = ADDRESS_COLLECTION.bsc;

// Your Ethereum wallet private key
const owner = process.env.PRIVATE_KEY
  ? new ethers.Wallet(process.env.PRIVATE_KEY!, provider)
  : ethers.Wallet.createRandom();

// Mainnet deployed Contract address
const lbfLogicAddress = process.env.LBF_LOGIC_PROXY_ADDRESS!;
const lbfStrategyAddress = process.env.LBF_STRATEGY_PROXY_ADDRESS!;
const lblLogicAddress = process.env.LBL_LOGIC_PROXY_ADDRESS!;
const lblStrategyAddress = process.env.LBL_STRATEGY_PROXY_ADDRESS!;
const storageAddress = process.env.STORAGE_PROXY_ADDRESS!;
const multiLogicProxyAddress = process.env.MULTILOGIC_PROXY_ADDRESS!;

// Test Environment
const LEADING_TYPE = 0; // 0: Venus, 1: Ola
const LP_POOL_ID = ADDRESSES.SWAP.Ape.XRP_BNB.PoolID;
const SWAP_ROUTER_ADDRESS = ADDRESSES.ApeswapRouter;
const SWAP_MASTER_ADDRESS = ADDRESSES.ApeswapMaster;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Initialize Contract
const USDT = new ethers.Contract(
  ADDRESSES.Token.USDT.Underlying,
  erc20Abi,
  owner
);
const xUSDT = new ethers.Contract(
  LEADING_TYPE == 0 ? ADDRESSES.Token.USDT.Venus : ADDRESSES.Token.USDT.Ola,
  cErcAbi,
  owner
);
const XRP = new ethers.Contract(
  ADDRESSES.Token.XRP.Underlying,
  erc20Abi,
  owner
);
const xXRP = new ethers.Contract(
  LEADING_TYPE == 0 ? ADDRESSES.Token.XRP.Venus : ADDRESSES.Token.XRP.Ola,
  cErcAbi,
  owner
);
const WBNB = new ethers.Contract(
  ADDRESSES.Token.BNB.Underlying,
  erc20Abi,
  owner
);
const xBNB = new ethers.Contract(
  LEADING_TYPE == 0 ? ADDRESSES.Token.BNB.Venus : ADDRESSES.Token.BNB.Ola,
  cEthAbi,
  owner
);
const XVS = new ethers.Contract(
  LEADING_TYPE == 0 ? ADDRESSES.Token.XVS.Venus : ADDRESSES.Token.XVS.Ola,
  erc20Abi,
  owner
);
const LP_TOKEN = new ethers.Contract(
  ADDRESSES.SWAP.Ape.XRP_BNB.LP,
  erc20Abi,
  owner
);
const MasterChef = new ethers.Contract(
  SWAP_MASTER_ADDRESS,
  masterChefAbi,
  owner
);
const PATH_XRP_USDT = [
  XRP.address,
  ADDRESSES.Token.BNB.Underlying,
  ADDRESSES.Token.USDT.Underlying,
];

// Variables for deployed contract
let tx,
  storage: StorageV3,
  lbfLogic: Logic,
  lbfStrategy: LendBorrowFarmStrategy,
  multiLogicProxy: MultiLogic;

let startTime: typeof time;

export const lbf_strategy = () => {
  before(async () => {
    lbfLogic = Logic__factory.connect(lbfLogicAddress, owner) as Logic;

    lbfStrategy = LendBorrowFarmStrategy__factory.connect(
      lbfStrategyAddress,
      owner
    );

    storage = StorageV3__factory.connect(storageAddress, owner) as StorageV3;

    multiLogicProxy = MultiLogic__factory.connect(
      multiLogicProxyAddress,
      owner
    ) as MultiLogic;
  });

  describe("Preparation", async () => {
    describe("MuliLogicProxy", async () => {
      it("Set Strategy address", async () => {
        const multiStrategyLength =
          (await multiLogicProxy.multiStrategyLength()) as BigNumber;

        if (multiStrategyLength.eq(0)) {
          tx = await multiLogicProxy.connect(owner).initStrategies(
            ["LBF", "LBL"],
            [
            {
              logicContract: lbfLogicAddress,
              strategyContract: lbfStrategyAddress,
            },
            {
              logicContract: lblLogicAddress,
              strategyContract: lblStrategyAddress,
            },
          ]);
          await tx.wait(1);
        } else {
          tx = await multiLogicProxy.connect(owner).addStrategy(
            "LBF",
            {
              logicContract: lbfLogicAddress,
              strategyContract: lbfStrategyAddress,
            },
            true
            );
          await tx.wait(1);
        }
      });

      it("Set Percentages, USDT [7000, 3000], BNB [6000, 4000]", async () => {
        tx = await multiLogicProxy
          .connect(owner)
          .setPercentages(USDT.address, [7000, 3000]);
        await tx.wait(1);

        tx = await multiLogicProxy
          .connect(owner)
          .setPercentages(ZERO_ADDRESS, [6000, 4000]);
        await tx.wait(1);
      });
    });

    describe("Init USDT with Strategy", async () => {
      it("Init Tokens (xUSDT/USDT)", async () => {
        tx = await lbfStrategy.connect(owner).init(USDT.address, xUSDT.address);
        await tx.wait(1);
      });

      it("Init Tokens (xBNB/BNB)", async () => {
        tx = await lbfStrategy.connect(owner).init(ZERO_ADDRESS, xBNB.address);
        await tx.wait(1);
      });

      it("Cannot init Tokens (xUSDT/USDT) again", async () => {
        tx = await lbfStrategy
          .connect(owner)
          .init(USDT.address, xUSDT.address)
          .should.be.revertedWith("F6");
      });
    });
  });

  describe("Step 1 - Deposit to Storage", async () => {
    it("Add USDT to storage", async () => {
      tx = await storage
        .connect(owner)
        .addToken(USDT.address, ADDRESSES.CHAINLINK.USDT);
      await tx.wait(1);
    });

    it("Add BNB to storage", async () => {
      tx = await storage
        .connect(owner)
        .addToken(ZERO_ADDRESS, ADDRESSES.CHAINLINK.BNB);
      await tx.wait(1);
    });

    it("Approve 1 USDT for storage", async () => {
      tx = await USDT.connect(owner).approve(
        storage.address,
        ethers.utils.parseEther("1")
      );
      await tx.wait(1);
    });

    it("Deposit 1 USDT from owner to storage", async () => {
      tx = await storage
        .connect(owner)
        .deposit(ethers.utils.parseEther("1"), USDT.address);
      await tx.wait(1);
    });

    it("Deposit 1 BNB from owner to storage", async () => {
      const tx = await storage
        .connect(owner)
        .deposit(ethers.utils.parseEther("1"), ZERO_ADDRESS, {
          from: owner.address,
          value: ethers.utils.parseEther("1").toString(),
        });
      await tx.wait(1);
    });
  });

  describe("Step 2 - LendToken", async () => {
    it("Lend BNB, USDT all", async () => {
      let balanceUSDTLogic = await USDT.balanceOf(lbfLogic.address);
      let balanceBNBLogic = await provider.getBalance(lbfLogic.address);
      let balancexUSDTLogic = await xUSDT.balanceOf(lbfLogic.address);
      let balancexBNBLogic = await xBNB.balanceOf(lbfLogic.address);

      tx = await lbfStrategy.connect(owner).lendToken();
      await tx.wait(1);

      let balanceUSDTLogicNew = await USDT.balanceOf(lbfLogic.address);
      let balanceBNBLogicNew = await provider.getBalance(lbfLogic.address);
      let balancexUSDTLogicNew = await xUSDT.balanceOf(lbfLogic.address);
      let balancexBNBLogicNew = await xBNB.balanceOf(lbfLogic.address);

      let balanceUSDTStorageNew = await USDT.balanceOf(storage.address);
      let balanceBNBStorageNew = await provider.getBalance(storage.address);

      expect(balanceUSDTLogicNew.toString()).to.be.eql(
        balanceUSDTLogic.toString(),
        "USDT balance of logic should be unchanged"
      );
      expect(balanceBNBLogicNew.toString()).to.be.eql(
        balanceBNBLogic.toString(),
        "BNB balance of logic should be unchanged"
      );
      expect(balancexUSDTLogicNew.gt(balancexUSDTLogic)).to.be.eql(
        true,
        "xUSDT should be increased"
      );
      expect(balancexBNBLogicNew.gt(balancexBNBLogic)).to.be.eql(
        true,
        "xBNB should be increased"
      );

      expect(balanceUSDTStorageNew.toString()).to.be.eql(
        "0",
        "USDT balance of storage should be 0"
      );
      expect(balanceBNBStorageNew.toString()).to.be.eql(
        "0",
        "BNB balance of storage should be 0"
      );
    });
  });

  xdescribe("Step 2 - Add Liquidity", async () => {
    describe("Add Borrow Tokens for Approve", async () => {
      xit("Add Tokens (xXRP/XRP)", async () => {
        tx = await lbfLogic
          .connect(owner)
          .addXTokens(XRP.address, xXRP.address, LEADING_TYPE);
        await tx.wait(1);
      });

      xit("Add Tokens (xBNB/BNB)", async () => {
        tx = await lbfLogic
          .connect(owner)
          .addXTokens(
            "0x0000000000000000000000000000000000000000",
            xBNB.address,
            LEADING_TYPE
          );
        await tx.wait(1);
      });
    });

    xdescribe("Mint", async () => {
      it("mint xUSDT for Logic with 0.5 USDT", async () => {
        let balanceUSDTLogic = await USDT.balanceOf(lbfLogic.address);

        tx = await logic
          .connect(owner)
          .mint(xUSDT.address, ethers.utils.parseEther("0.5").toString());
        await tx.wait(1);

        let balanceUSDTLogicNew = await USDT.balanceOf(lbfLogic.address);

        expect(
          balanceUSDTLogicNew.add(ethers.utils.parseEther("0.5")).toString()
        ).to.be.eql(
          balanceUSDTLogic.toString(),
          "USDT balance of logic should be decreased by 0.5"
        );
      });

      after(async () => {
        logValue(
          "Logic   balance in xUSDT",
          await xUSDT.balanceOf(lbfLogic.address)
        );
        logValue(
          "Logic   balance in USDT",
          await USDT.balanceOf(lbfLogic.address)
        );
        logValue(
          "Logic   balance in BNB",
          await provider.getBalance(lbfLogic.address)
        );
      });
    });

    xdescribe("Borrow BNB, XRP", async () => {
      xit("borrow 0.0001 BNB using xUSDT", async () => {
        let balanceBNB = await provider.getBalance(lbfLogic.address);

        tx = await logic
          .connect(owner)
          .borrow(
            xBNB.address,
            ethers.utils.parseEther("0.0001"),
            LEADING_TYPE
          );
        await tx.wait(1);

        let balanceBNBNew = await provider.getBalance(lbfLogic.address);
        expect(
          balanceBNB.add(ethers.utils.parseEther("0.0001")).toString()
        ).to.be.eql(
          balanceBNBNew.toString(),
          "BNB balance of logic should be increased by 0.0001"
        );
      });

      xit("borrow 0.01 XRP using xUSDT", async () => {
        let balanceXRP = await XRP.balanceOf(lbfLogic.address);

        tx = await logic
          .connect(owner)
          .borrow(xXRP.address, ethers.utils.parseEther("0.01"), LEADING_TYPE);
        await tx.wait(1);

        let balanceXRPNew = await XRP.balanceOf(lbfLogic.address);
        expect(
          balanceXRP.add(ethers.utils.parseEther("0.01")).toString()
        ).to.be.eql(
          balanceXRPNew.toString(),
          "XRP balance of logic should be increased by 0.0001"
        );
      });
    });

    xdescribe("Liquidity", async () => {
      xit("Add Liquidity with 0.01 XRP, 0.0001 BNB", async () => {
        let balanceXRP = await XRP.balanceOf(lbfLogic.address);
        let balanceBNB = await provider.getBalance(lbfLogic.address);
        let balanceLP = await LP_TOKEN.balanceOf(lbfLogic.address);

        startTime = await time.latest();
        tx = await logic
          .connect(owner)
          .addLiquidityETH(
            SWAP_ROUTER_ADDRESS,
            XRP.address,
            ethers.utils.parseEther("0.01").toString(),
            ethers.utils.parseEther("0.0001").toString(),
            0,
            0,
            startTime.add(time.duration.minutes(20)).toString()
          );
        await tx.wait(1);

        let balanceXRPNew = await XRP.balanceOf(lbfLogic.address);
        let balanceBNBNew = await provider.getBalance(lbfLogic.address);
        let balanceLPNew = await LP_TOKEN.balanceOf(lbfLogic.address);

        expect(balanceXRPNew.lt(balanceXRP)).to.be.eql(
          true,
          "XRP balance of logic should be decreased"
        );
        expect(balanceBNBNew.lt(balanceBNB)).to.be.eql(
          true,
          "BNB balance of logic should be decreased"
        );
        expect(balanceLPNew.gt(balanceLP)).to.be.eql(
          true,
          "LP(Cake) Token balance of logic should be increased"
        );
      });

      xit("Approve MasterChef on XRP-BNB LP Token", async () => {
        await lbfLogic.connect(owner).approveTokenForSwap(LP_TOKEN.address);
      });

      xit("Deposit total LP token to MasterChef for XRP-BNB LP Pool", async () => {
        let balanceLogic = await LP_TOKEN.balanceOf(lbfLogic.address);
        let balanceMaster = await LP_TOKEN.balanceOf(SWAP_MASTER_ADDRESS);

        tx = await logic
          .connect(owner)
          .deposit(SWAP_MASTER_ADDRESS, LP_POOL_ID, balanceLogic.toString());
        await tx.wait(1);

        let balanceLogicNew = await LP_TOKEN.balanceOf(lbfLogic.address);
        let balanceMasterNew = await LP_TOKEN.balanceOf(SWAP_MASTER_ADDRESS);

        expect(balanceLogicNew.toString()).to.be.eql(
          "0",
          "LP balance of logic should be 0"
        );
        expect(balanceMaster.add(balanceLogic).toString()).to.be.eql(
          balanceMasterNew.toString(),
          "LP balance of MasterChef should be increased as logic balance"
        );
      });

      xit("Add XRP BNB pair to reserve", async () => {
        let count = await lbfStrategy.connect(owner).getReservesCount();
        for (let i = 0; i < count.toNumber(); i++) {
          tx = await lbfStrategy.connect(owner).deleteLastReserveLiquidity();
          await tx.wait(1);
        }

        tx = await lbfStrategy.connect(owner).addReserveLiquidity({
          tokenA: XRP.address,
          tokenB: "0x0000000000000000000000000000000000000000",
          xTokenA: xXRP.address,
          xTokenB: xBNB.address,
          swap: SWAP_ROUTER_ADDRESS,
          swapMaster: SWAP_MASTER_ADDRESS,
          lpToken: LP_TOKEN.address,
          poolID: LP_POOL_ID,
          path: [PATH_XRP_USDT],
        });
        await tx.wait(1);

        count = await lbfStrategy.connect(owner).getReservesCount();

        expect(count.toString()).to.be.eql("1", "Reserve count should be 1");
      });
    });
  });

  xdescribe("Step 3 - Claim", async () => {
    it("Claim Rewards with XVS Token", async () => {
      let XVSBalance = await XVS.balanceOf(lbfLogic.address);

      tx = await lbfLogic.connect(owner).claim([xUSDT.address], LEADING_TYPE);
      await tx.wait(1);

      let XVSBalanceNew = await XVS.balanceOf(lbfLogic.address);

      expect(XVSBalanceNew.gt(XVSBalance)).to.be.eql(
        true,
        "XVS balance of logic should be increased"
      );
    });

    after(async () => {
      logValue("XVS Award", await XVS.balanceOf(lbfLogic.address));
    });
  });

  xdescribe("Step 4 - redeemUnderlying", async () => {
    xit("Remove pair from reserve", async () => {
      let count = await lbfStrategy.connect(owner).getReservesCount();
      for (let i = 0; i < count.toNumber(); i++) {
        tx = await lbfStrategy.connect(owner).deleteLastReserveLiquidity();
        await tx.wait(1);
      }

      count = await lbfStrategy.connect(owner).getReservesCount();

      expect(count.toString()).to.be.eql("0", "Reserve count should be 0");
    });

    xit("Withdraw total XRT-BNB LP from MasterChef", async () => {
      let balanceLogic = await LP_TOKEN.balanceOf(lbfLogic.address);
      let balanceMaster = await LP_TOKEN.balanceOf(SWAP_MASTER_ADDRESS);

      let [depositAmount] = await MasterChef.userInfo(
        LP_POOL_ID,
        lbfLogic.address
      );

      tx = await lbfLogic
        .connect(owner)
        .withdraw(SWAP_MASTER_ADDRESS, LP_POOL_ID, depositAmount.toString());
      await tx.wait(1);

      let balanceLogicNew = await LP_TOKEN.balanceOf(lbfLogic.address);
      let balanceMasterNew = await LP_TOKEN.balanceOf(SWAP_MASTER_ADDRESS);

      expect(balanceLogic.add(depositAmount).toString()).to.be.eql(
        balanceLogicNew.toString(),
        "LP balance of Logic should be increased"
      );
      expect(balanceMasterNew.add(depositAmount).toString()).to.be.eql(
        balanceMaster.toString(),
        "LP balance of MasterChef should be decreased"
      );
    });

    xit("Remove Liquidity with XRT BNB(Total)", async () => {
      let balanceXRP = await XRP.balanceOf(lbfLogic.address);
      let balanceBNB = await provider.getBalance(lbfLogic.address);
      let balanceLP = await LP_TOKEN.balanceOf(lbfLogic.address);

      startTime = await time.latest();
      tx = await lbfLogic
        .connect(owner)
        .removeLiquidityETH(
          SWAP_ROUTER_ADDRESS,
          XRP.address,
          balanceLP.toString(),
          0,
          0,
          startTime.add(time.duration.minutes(20)).toString()
        );
      await tx.wait(1);

      let balanceXRPNew = await XRP.balanceOf(lbfLogic.address);
      let balanceBNBNew = await provider.getBalance(lbfLogic.address);
      let balanceLPNew = await LP_TOKEN.balanceOf(lbfLogic.address);

      expect(balanceXRPNew.gt(balanceXRP)).to.be.eql(
        true,
        "XRP balance of logic should be increased"
      );
      expect(balanceBNBNew.gt(balanceBNB)).to.be.eql(
        true,
        "BNB balance of logic should be increased"
      );
      expect(balanceLPNew.toString()).to.be.eql(
        "0",
        "LP Token balance of logic should be 0"
      );
    });

    it("repayBorrow total XRP", async () => {
      let balanceXRP = await XRP.balanceOf(lbfLogic.address);
      let borrowBalance = await xXRP.borrowBalanceStored(lbfLogic.address);

      tx = await lbfLogic
        .connect(owner)
        .repayBorrow(xXRP.address, borrowBalance);
      await tx.wait(1);

      let balanceXRPNew = await XRP.balanceOf(lbfLogic.address);
      expect(balanceXRPNew.add(borrowBalance).toString()).to.be.eql(
        balanceXRP.toString(),
        "XRP balance of logic should be decreased"
      );
    });

    xit("repayBorrow total BNB", async () => {
      let balanceBNB = await provider.getBalance(lbfLogic.address);
      let borrowBalance = await xBNB.borrowBalanceStored(lbfLogic.address);

      tx = await lbfLogic
        .connect(owner)
        .repayBorrow(xBNB.address, borrowBalance.toString());
      await tx.wait(1);

      let balanceBNBNew = await provider.getBalance(lbfLogic.address);
      expect(balanceBNBNew.add(borrowBalance).toString()).to.be.eql(
        balanceBNB.toString(),
        "BNB balance of logic should be decreased"
      );
    });

    xit("redeemUnderlying for xUSDT", async () => {
      let balanceUSDTLogic = await USDT.balanceOf(lbfLogic.address);
      let balancexUSDTLogic = await xUSDT.balanceOf(lbfLogic.address);

      tx = await lbfLogic
        .connect(owner)
        .redeemUnderlying(
          xUSDT.address,
          ethers.utils.parseEther("0.5").toString()
        );
      await tx.wait(1);

      let balanceUSDTLogicNew = await USDT.balanceOf(lbfLogic.address);
      let balancexUSDTLogicNew = await xUSDT.balanceOf(lbfLogic.address);

      expect(
        balanceUSDTLogic.add(ethers.utils.parseEther("0.5")).toString()
      ).to.be.eql(
        balanceUSDTLogicNew.toString(),
        "USDT balance of logic should be increased by 0.5"
      );
      expect(balancexUSDTLogicNew.lt(balancexUSDTLogic)).to.be.eql(
        true,
        "xUSDT balance of logic should be decreased"
      );
    });
  });

  xdescribe("Step 5 - withdraw", async () => {
    it("Withdraw 0.3 USDT from storage to owner", async () => {
      let balanceUSDTOwner = await USDT.balanceOf(owner.address);

      tx = await storage
        .connect(owner)
        .withdraw(ethers.utils.parseEther("0.3").toString(), USDT.address);
      await tx.wait(1);

      let balanceUSDTOwnerNew = await USDT.balanceOf(owner.address);

      expect(
        balanceUSDTOwner.add(ethers.utils.parseEther("0.3")).toString()
      ).to.be.eql(
        balanceUSDTOwnerNew.toString(),
        "USDT balance of owner should be increased by 0.3"
      );
    });

    xit("Withdraw 0.4 USDT from storage to owner", async () => {
      let balanceUSDTOwner = await USDT.balanceOf(owner.address);

      tx = await storage
        .connect(owner)
        .withdraw(ethers.utils.parseEther("0.4").toString(), USDT.address);
      await tx.wait(1);

      let balanceUSDTOwnerNew = await USDT.balanceOf(owner.address);

      expect(
        balanceUSDTOwner.add(ethers.utils.parseEther("0.4")).toString()
      ).to.be.eql(
        balanceUSDTOwnerNew.toString(),
        "USDT balance of owner should be increased by 0.4"
      );
    });
  });
};
