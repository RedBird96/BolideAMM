/*******************************************
 * Test on BSC Mainnet
 * Before run test, deploy farmLogic contract on main
 * Owner should have at least 1 USDT
 *******************************************/

import dotenv from "dotenv";
import {ethers} from "hardhat";
import {expect} from "chai";
import {sleep, logValue} from "../../utils/helpers";
import {cErcAbi} from "../../data/contracts_abi/compound.json";
import {erc20Abi} from "../../data/contracts_abi/erc20.json";
import {ADDRESS_COLLECTION, PLATFORM} from "../../data/addresses.json";
import {BigNumber} from "ethers";
import {
  Logic,
  StorageV3,
  MultiLogic,
  LendBorrowLendStrategy,
  LendBorrowLendStrategy__factory,
  Logic__factory,
  StorageV3__factory,
  MultiLogic__factory,
} from "../../typechain-types";

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

// Testnet deployed Contract address
const farmLogicAddress = process.env.LBF_LOGIC_PROXY_ADDRESS!;
const farmStrategyAddress = process.env.LBF_STRATEGY_PROXY_ADDRESS!;
const olaLogicAddress = process.env.LBL_LOGIC_PROXY_ADDRESS!;
const olaStrategyAddress = process.env.LBL_STRATEGY_PROXY_ADDRESS!;
const storageAddress = process.env.STORAGE_PROXY_ADDRESS!;
const multiLogicProxyAddress = process.env.MULTILOGIC_PROXY_ADDRESS!;

//const USDC = new ethers.Contract("0x55d398326f99059fF775485246999027B3197955", erc20Abi, owner);
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
const BANANA = new ethers.Contract(
  ADDRESSES.Token.BANANA.Underlying,
  erc20Abi,
  owner
);

const BLID = new ethers.Contract(blidAddress, erc20Abi, owner);

const oUSDT = new ethers.Contract(ADDRESSES.Token.USDT.Ola, cErcAbi, owner);
const oBUSD = new ethers.Contract(ADDRESSES.Token.BUSD.Ola, cErcAbi, owner);

const amountUSDTFirstDepositToStorage: BigNumber =
  ethers.utils.parseEther("0.018"); // USDT
const amountBUSDFirstDepositToStorage: BigNumber =
  ethers.utils.parseEther("0.006"); // BUSD

const amountUSDTSecondDepositToStorage: BigNumber =
  ethers.utils.parseEther("0.008"); // USDT
const amountBUSDSecondDepositToStorage: BigNumber =
  ethers.utils.parseEther("0.004"); // BUSD
const minimumBLIDPerRewardToken: BigNumber = BigNumber.from("10");

// Variables for deployed contract
let storage: StorageV3,
  lblStrategy: LendBorrowLendStrategy,
  lbfStrategy: LendBorrowLendStrategy,
  farmLogic: Logic,
  multiProxy: MultiLogic,
  olaLogic: Logic;

export const multiLogicProxy = () => {
  before(async () => {
    farmLogic = Logic__factory.connect(farmLogicAddress, owner) as Logic;

    olaLogic = Logic__factory.connect(olaLogicAddress, owner) as Logic;

    storage = StorageV3__factory.connect(storageAddress, owner) as StorageV3;

    multiProxy = MultiLogic__factory.connect(
      multiLogicProxyAddress,
      owner
    ) as MultiLogic;

    lblStrategy = LendBorrowLendStrategy__factory.connect(
      olaStrategyAddress,
      owner
    ) as LendBorrowLendStrategy;

    lbfStrategy = LendBorrowLendStrategy__factory.connect(
      farmStrategyAddress,
      owner
    ) as LendBorrowLendStrategy;
  });
  xdescribe("Logic1 Prepare", async () => {
    describe("Set pathToSwapRewardsToBLID", async () => {
      it("Length of pathToSwapRewardsToBLID should be more than 2", async () => {
        const tx = await expect(
          lblStrategy.connect(owner).setPathToSwapRewardsToBLID([USDT.address])
        ).to.be.revertedWith("L6");
      });

      it("pathToSwapRewardsToBLID should start with BANANA token", async () => {
        const tx = await expect(
          lblStrategy
            .connect(owner)
            .setPathToSwapRewardsToBLID([USDT.address, BLID.address])
        ).to.be.revertedWith("L7");
      });

      it("pathToSwapRewardsToBLID should end with BLID token", async () => {
        const tx = await expect(
          lblStrategy
            .connect(owner)
            .setPathToSwapRewardsToBLID([
              ADDRESSES.Token.BANANA.Underlying,
              USDT.address,
            ])
        ).to.be.revertedWith("L8");
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
    });

    describe("Set avoidLiquidationFactor", async () => {
      it("Set avoidLiquidationFactor as 2", async () => {
        const tx = await lblStrategy
          .connect(owner)
          .setAvoidLiquidationFactor(2, USDT.address);
        await tx.wait(1);
      });
    });

    describe("Init Circle", async () => {
      it("Only owner can init circle", async () => {
        const tx = await expect(
          lblStrategy.connect(other).init(USDT.address, oUSDT.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Init with USDT/oUSDT", async () => {
        let tx;
        tx = await lblStrategy.connect(owner).init(USDT.address, oUSDT.address);
        await tx.wait(1);
      });

      it("Cannot init with USDT/oUSDT again", async () => {
        const tx = await expect(
          lblStrategy.connect(owner).init(USDT.address, oUSDT.address)
        ).to.be.revertedWith("L10");
      });

      it("Second Init with BUSD/oBUSD", async () => {
        let tx;
        tx = await lblStrategy.connect(owner).init(BUSD.address, oBUSD.address);
        await tx.wait(1);
      });

      it("Only owner can set circlesCount", async () => {
        const tx = await expect(
          lblStrategy.connect(other).setCirclesCount(10, USDT.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Set circlesCount to be 3", async () => {
        const tx = await lblStrategy
          .connect(owner)
          .setCirclesCount(3, USDT.address);
        await tx.wait(6);

        const circlesCount = await lblStrategy.connect(owner).circlesCount();
        expect(circlesCount).to.be.equal(3, "CirclesCount should be 3");
      });
    });
  });

  xdescribe("Logic2 Prepare", async () => {
    describe("Set pathToSwapRewardsToBLID", async () => {
      it("Length of pathToSwapRewardsToBLID should be more than 2", async () => {
        const tx = await expect(
          lbfStrategy.connect(owner).setPathToSwapRewardsToBLID([USDT.address])
        ).to.be.revertedWith("L6");
      });

      it("pathToSwapRewardsToBLID should start with BANANA token", async () => {
        const tx = await expect(
          lbfStrategy
            .connect(owner)
            .setPathToSwapRewardsToBLID([USDT.address, BLID.address])
        ).to.be.revertedWith("L7");
      });

      it("pathToSwapRewardsToBLID should end with BLID token", async () => {
        const tx = await expect(
          lbfStrategy
            .connect(owner)
            .setPathToSwapRewardsToBLID([
              ADDRESSES.Token.BANANA.Underlying,
              USDT.address,
            ])
        ).to.be.revertedWith("L8");
      });

      it("Set pathToSwapRewardsToBLID as BANANA-BNB-USDT-BLID", async () => {
        const tx = await lbfStrategy
          .connect(owner)
          .setPathToSwapRewardsToBLID([
            ADDRESSES.Token.BANANA.Underlying,
            ADDRESSES.Token.BNB.Underlying,
            ADDRESSES.Token.USDT.Underlying,
            BLID.address,
          ]);
        await tx.wait(1);
      });
    });

    describe("Set avoidLiquidationFactor", async () => {
      it("Set avoidLiquidationFactor as 2", async () => {
        const tx = await lbfStrategy
          .connect(owner)
          .setAvoidLiquidationFactor(2, USDT.address);
        await tx.wait(1);
      });
    });

    describe("Init Circle", async () => {
      it("Only owner can init circle", async () => {
        const tx = await expect(
          lbfStrategy.connect(other).init(USDT.address, oUSDT.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Init with USDT/oUSDT", async () => {
        let tx;
        tx = await lbfStrategy.connect(owner).init(USDT.address, oUSDT.address);
        await tx.wait(1);
      });

      it("Cannot init with USDT/oUSDT again", async () => {
        const tx = await expect(
          lbfStrategy.connect(owner).init(USDT.address, oUSDT.address)
        ).to.be.revertedWith("L10");
      });

      it("Second Init with BUSD/oBUSD", async () => {
        let tx;
        tx = await lbfStrategy.connect(owner).init(BUSD.address, oBUSD.address);
        await tx.wait(1);
      });

      it("Only owner can set circlesCount", async () => {
        const tx = await expect(
          lbfStrategy.connect(other).setCirclesCount(10, USDT.address)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Set circlesCount to be 5", async () => {
        const tx = await lbfStrategy
          .connect(owner)
          .setCirclesCount(5, USDT.address);
        await tx.wait(6);

        const circlesCount = await lbfStrategy.connect(owner).circlesCount();
        expect(circlesCount).to.be.equal(5, "CirclesCount should be 5");
      });
    });
  });

  xdescribe("Set MultiLogic Parameters", async () => {
    it("Can't set percent before strategies setting", async () => {
      const tx = await expect(
        multiProxy.connect(owner).setPercentages(USDT.address, [3000, 7000])
      ).to.be.revertedWith("M3");
    });

    it("Only owner can set Logic and Strategy addresses", async () => {
      const tx = await expect(
        multiProxy.connect(other).initStrategies(
          ["LBF", "LBL"],
          [
            {
              logicContract: farmLogic.address,
              strategyContract: lbfStrategy.address,
            },
            {
              logicContract: olaLogic.address,
              strategyContract: lblStrategy.address,
            },
          ]
        ) //todo change
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Success set Strategy address", async () => {
      const tx2 = await multiProxy.connect(owner).initStrategies(
        ["LBF", "LBL"],
        [
          {
            logicContract: farmLogic.address,
            strategyContract: lbfStrategy.address,
          },
          {
            logicContract: olaLogic.address,
            strategyContract: lblStrategy.address,
          },
        ]
      );
      await tx2.wait(1);
    });

    it("Can't overwrite exist strategy", async () => {
      const tx2 = await expect(
        multiProxy.connect(owner).addStrategy(
          "LBF",
          {
            logicContract: farmLogic.address,
            strategyContract: lbfStrategy.address,
          },
          false
        )
      ).to.be.revertedWith("M9");
    });

    it("Only owner can set Percentage", async () => {
      const tx = await expect(
        multiProxy.connect(other).setPercentages(USDT.address, [3000, 7000])
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Percentages sum must be 100%", async () => {
      const tx = await expect(
        multiProxy.connect(owner).setPercentages(USDT.address, [3000, 5000])
      ).to.be.revertedWith("M3");
    });

    it("Success set Percentages", async () => {
      await multiProxy
        .connect(owner)
        .setPercentages(USDT.address, [3000, 7000]);
      await multiProxy
        .connect(owner)
        .setPercentages(BUSD.address, [5000, 5000]);
    });
  });

  describe("First Deposit", async () => {
    it("Approve USDT & BUSD to Storage", async () => {
      const tx = await USDT.connect(owner).approve(
        storage.address,
        amountUSDTFirstDepositToStorage.add(amountUSDTSecondDepositToStorage)
      );
      await tx.wait(1);

      const tx2 = await BUSD.connect(owner).approve(
        storage.address,
        amountBUSDFirstDepositToStorage.add(amountBUSDSecondDepositToStorage)
      );
      await tx2.wait(1);
    });
    it("Deposit USDT to storage and set divide amount to MultiProxy", async () => {
      let oldfarmlogicTokenAvailable = await multiProxy.getTokenAvailable(
        USDT.address,
        farmLogic.address
      );
      let oldlogicTokenAvailable = await multiProxy.getTokenAvailable(
        USDT.address,
        olaLogic.address
      );

      const tx1 = await storage
        .connect(owner)
        .deposit(amountUSDTFirstDepositToStorage, USDT.address);

      await tx1.wait(1);

      let newfarmlogicTokenAvailable = await multiProxy.getTokenAvailable(
        USDT.address,
        farmLogic.address
      );
      let newlogicTokenAvailable = await multiProxy.getTokenAvailable(
        USDT.address,
        olaLogic.address
      );

      expect(
        oldfarmlogicTokenAvailable
          .add(amountUSDTFirstDepositToStorage.mul(3000).div(10000))
          .toString()
      ).to.be.equal(
        newfarmlogicTokenAvailable.toString(),
        "USDT farmLogic available should be increased by 30%"
      );
      expect(
        oldlogicTokenAvailable
          .add(amountUSDTFirstDepositToStorage.mul(7000).div(10000))
          .toString()
      ).to.be.equal(
        newlogicTokenAvailable.toString(),
        "USDT olaLogic available should be increased by 70%"
      );
    });

    it("Deposit BUSD to storage and set divide amount to MultiProxy token available", async () => {
      let oldfarmlogicTokenAvailable = await multiProxy.getTokenAvailable(
        BUSD.address,
        farmLogic.address
      );
      let oldlogicTokenAvailable = await multiProxy.getTokenAvailable(
        BUSD.address,
        olaLogic.address
      );

      const tx1 = await storage
        .connect(owner)
        .deposit(amountBUSDFirstDepositToStorage, BUSD.address);

      await tx1.wait(1);

      let newfarmlogicTokenAvailable = await multiProxy.getTokenAvailable(
        BUSD.address,
        farmLogic.address
      );
      let newlogicTokenAvailable = await multiProxy.getTokenAvailable(
        BUSD.address,
        olaLogic.address
      );

      expect(
        oldfarmlogicTokenAvailable
          .add(amountBUSDFirstDepositToStorage.mul(5000).div(10000))
          .toString()
      ).to.be.equal(
        newfarmlogicTokenAvailable.toString(),
        "BUSD farmLogic available deposited by 50%"
      );
      expect(
        oldlogicTokenAvailable
          .add(amountBUSDFirstDepositToStorage.mul(5000).div(10000))
          .toString()
      ).to.be.equal(
        newlogicTokenAvailable.toString(),
        "BUSD olaLogic available deposited by 50%"
      );
    });
  });

  describe("First Build", async () => {
    it("take USDT large amount than divide available", async () => {
      expect(
        await farmLogic.takeTokenFromStorage(
          amountUSDTFirstDepositToStorage.mul(4000).div(10000).toString(),
          USDT.address
        )
      ).to.be.revertedWith("M6");
      expect(
        await olaLogic.takeTokenFromStorage(
          amountUSDTFirstDepositToStorage.mul(4000).div(10000).toString(),
          USDT.address
        )
      ).to.be.revertedWith("M6");
    });
    it("take BUSD large amount than divide available", async () => {
      expect(
        await farmLogic.takeTokenFromStorage(
          amountBUSDFirstDepositToStorage.mul(6000).div(10000).toString(),
          BUSD.address
        )
      ).to.be.revertedWith("M6");
      expect(
        await olaLogic.takeTokenFromStorage(
          amountBUSDFirstDepositToStorage.mul(6000).div(10000).toString(),
          BUSD.address
        )
      ).to.be.revertedWith("M6");
    });

    it("Only owner can build circle", async () => {
      const tx = await expect(
        lblStrategy
          .connect(other)
          .build(
            amountUSDTFirstDepositToStorage.mul(3000).div(10000),
            USDT.address
          )
      ).to.be.revertedWith("OA2");
    });

    it("Token should be inited", async () => {
      const tx = await expect(
        lblStrategy
          .connect(owner)
          .build(
            amountUSDTFirstDepositToStorage.mul(3000).div(10000),
            BANANA.address
          )
      ).to.be.revertedWith("L2");
    });

    it("Build Init with USDT", async () => {
      let oldfarmlogicTokenAvailable = await multiProxy.getTokenAvailable(
        USDT.address,
        farmLogic.address
      );
      let oldlogicTokenAvailable = await multiProxy.getTokenAvailable(
        USDT.address,
        olaLogic.address
      );

      const tx = await lbfStrategy
        .connect(owner)
        .build(
          amountUSDTFirstDepositToStorage.mul(5000).div(10000),
          USDT.address
        );
      await tx.wait(1);

      const tx2 = await lblStrategy
        .connect(owner)
        .build(
          amountUSDTFirstDepositToStorage.mul(5000).div(10000),
          USDT.address
        );
      await tx2.wait(1);

      let farmlogicTokenAvailable = await multiProxy.getTokenAvailable(
        USDT.address,
        farmLogic.address
      );
      let logicTokenAvailable = await multiProxy.getTokenAvailable(
        USDT.address,
        olaLogic.address
      );
      expect(
        farmlogicTokenAvailable
          .add(amountUSDTFirstDepositToStorage.mul(5000).div(10000))
          .toString()
      ).to.be.equal(
        oldfarmlogicTokenAvailable.toString(),
        "USDT farmLogic take Token from storage as 30% deposited amount"
      );
      expect(
        logicTokenAvailable
          .add(amountUSDTFirstDepositToStorage.mul(5000).div(10000))
          .toString()
      ).to.be.equal(
        oldlogicTokenAvailable.toString(),
        "USDT olaLogic take Token from storage as 70% deposited amount"
      );
    });
    it("Only owner can build circle", async () => {
      const tx = await expect(
        lblStrategy
          .connect(other)
          .build(
            amountBUSDFirstDepositToStorage.mul(5000).div(10000),
            USDT.address
          )
      ).to.be.revertedWith("OA2");
    });

    it("Token should be inited", async () => {
      const tx = await expect(
        lblStrategy
          .connect(owner)
          .build(
            amountBUSDFirstDepositToStorage.mul(5000).div(10000),
            BANANA.address
          )
      ).to.be.revertedWith("L2");
    });
    it("Build Init with BUSD", async () => {
      let oldfarmlogicTokenAvailable = await multiProxy.getTokenAvailable(
        BUSD.address,
        farmLogic.address
      );
      let oldlogicTokenAvailable = await multiProxy.getTokenAvailable(
        BUSD.address,
        olaLogic.address
      );

      const tx = await lbfStrategy
        .connect(owner)
        .build(
          amountBUSDFirstDepositToStorage.mul(5000).div(10000),
          BUSD.address
        );
      await tx.wait(1);

      const tx2 = await lblStrategy
        .connect(owner)
        .build(
          amountBUSDFirstDepositToStorage.mul(5000).div(10000),
          BUSD.address
        );
      await tx2.wait(1);

      let farmlogicTokenAvailable = await multiProxy.getTokenAvailable(
        BUSD.address,
        farmLogic.address
      );
      let logicTokenAvailable = await multiProxy.getTokenAvailable(
        BUSD.address,
        olaLogic.address
      );
      expect(
        farmlogicTokenAvailable
          .add(amountBUSDFirstDepositToStorage.mul(5000).div(10000))
          .toString()
      ).to.be.equal(
        oldfarmlogicTokenAvailable.toString(),
        "BUSD farmLogic take Token from storage as 50% deposited amount"
      );
      expect(
        logicTokenAvailable
          .add(amountBUSDFirstDepositToStorage.mul(5000).div(10000))
          .toString()
      ).to.be.equal(
        oldlogicTokenAvailable.toString(),
        "BUSD olaLogic take Token from storage as 50% deposited amount"
      );
    });
  });

  describe("Rebuild", async () => {
    it("Destory with USDT", async () => {
      let oldfarmlogicTokenBalance = await multiProxy.getTokenAvailable(
        USDT.address,
        farmLogic.address
      );
      let oldlogicTokenBalance = await multiProxy.getTokenAvailable(
        USDT.address,
        olaLogic.address
      );

      const tx = await lbfStrategy.connect(owner).destroy(USDT.address);
      await tx.wait(1);

      let newfarmlogicTokenBalance = await multiProxy.getTokenAvailable(
        USDT.address,
        farmLogic.address
      );
      let newlogicTokenBalance = await multiProxy.getTokenAvailable(
        USDT.address,
        olaLogic.address
      );

      expect(
        oldfarmlogicTokenBalance
          .add(amountBUSDFirstDepositToStorage.mul(3000).div(10000))
          .toString()
      ).to.be.equal(
        newfarmlogicTokenBalance.toString(),
        "USDT farmLogic available should be decreased 30% deposted amount"
      );
      expect(
        oldlogicTokenBalance
          .add(amountBUSDFirstDepositToStorage.mul(7000).div(10000))
          .toString()
      ).to.be.equal(
        newlogicTokenBalance.toString(),
        "USDT farmLogic available should be decreased 70% deposted amount"
      );
    });

    it("Destory with BUSD", async () => {
      let oldfarmlogicTokenBalance = await multiProxy.getTokenAvailable(
        BUSD.address,
        farmLogic.address
      );
      let oldlogicTokenBalance = await multiProxy.getTokenAvailable(
        BUSD.address,
        olaLogic.address
      );

      const tx = await lbfStrategy.connect(owner).destroy(BUSD.address);
      await tx.wait(1);

      const tx2 = await lblStrategy.connect(owner).destroy(BUSD.address);
      await tx2.wait(1);

      let newfarmlogicTokenBalance = await multiProxy.getTokenAvailable(
        BUSD.address,
        farmLogic.address
      );
      let newlogicTokenBalance = await multiProxy.getTokenAvailable(
        BUSD.address,
        olaLogic.address
      );

      expect(
        oldfarmlogicTokenBalance
          .add(amountBUSDFirstDepositToStorage.mul(5000).div(10000))
          .toString()
      ).to.be.equal(
        newfarmlogicTokenBalance.toString(),
        "BUSD farmLogic available should be decreased 30% deposted amount"
      );
      expect(
        oldlogicTokenBalance
          .add(amountBUSDFirstDepositToStorage.mul(5000).div(10000))
          .toString()
      ).to.be.equal(
        newlogicTokenBalance.toString(),
        "BUSD farmLogic available should be decreased 70% deposted amount"
      );
    });

    it("Build again with USDT", async () => {
      await lbfStrategy.connect(owner).setCirclesCount(5, USDT.address);

      await lbfStrategy
        .connect(owner)
        .build(
          amountUSDTFirstDepositToStorage.mul(3000).div(10000),
          USDT.address
        );

      await lblStrategy.connect(owner).setCirclesCount(3, USDT.address);
      await lblStrategy
        .connect(owner)

        .build(
          amountUSDTFirstDepositToStorage.mul(7000).div(10000),
          USDT.address
        );
    });
    it("Build again with BUSD", async () => {
      await lbfStrategy
        .connect(owner)
        .build(
          amountBUSDFirstDepositToStorage.mul(5000).div(10000),
          BUSD.address
        );

      await lblStrategy
        .connect(owner)
        .build(
          amountBUSDFirstDepositToStorage.mul(5000).div(10000),
          BUSD.address
        );
    });
  });

  describe("Second Deposit", async () => {
    it("Second USDT Deposit to storage and set divide amount to MultiProxy", async () => {
      let oldfarmlogicTokenAvailable = await multiProxy.getTokenAvailable(
        USDT.address,
        farmLogic.address
      );
      let oldlogicTokenAvailable = await multiProxy.getTokenAvailable(
        USDT.address,
        olaLogic.address
      );

      const tx1 = await storage
        .connect(owner)
        .deposit(amountUSDTSecondDepositToStorage, USDT.address);

      await tx1.wait(1);

      let newfarmlogicTokenAvailable = await multiProxy.getTokenAvailable(
        USDT.address,
        farmLogic.address
      );
      let newlogicTokenAvailable = await multiProxy.getTokenAvailable(
        USDT.address,
        olaLogic.address
      );

      expect(
        oldfarmlogicTokenAvailable
          .add(amountUSDTSecondDepositToStorage.mul(3000).div(10000))
          .toString()
      ).to.be.equal(
        newfarmlogicTokenAvailable.toString(),
        "USDT farmLogic available should be increased by 30%"
      );
      expect(
        oldlogicTokenAvailable
          .add(amountUSDTSecondDepositToStorage.mul(7000).div(10000))
          .toString()
      ).to.be.equal(
        newlogicTokenAvailable.toString(),
        "USDT olaLogic available should be increased by 70%"
      );
    });

    it("Deposit BUSD to storage and set divide amount to MultiProxy token available", async () => {
      let oldfarmlogicTokenAvailable = await multiProxy.getTokenAvailable(
        BUSD.address,
        farmLogic.address
      );
      let oldlogicTokenAvailable = await multiProxy.getTokenAvailable(
        BUSD.address,
        olaLogic.address
      );

      const tx1 = await storage
        .connect(owner)
        .deposit(amountBUSDSecondDepositToStorage, BUSD.address);

      await tx1.wait(1);

      let newfarmlogicTokenAvailable = await multiProxy.getTokenAvailable(
        BUSD.address,
        farmLogic.address
      );
      let newlogicTokenAvailable = await multiProxy.getTokenAvailable(
        BUSD.address,
        olaLogic.address
      );

      expect(
        oldfarmlogicTokenAvailable
          .add(amountBUSDSecondDepositToStorage.mul(5000).div(10000))
          .toString()
      ).to.be.equal(
        newfarmlogicTokenAvailable.toString(),
        "BUSD farmLogic available deposited by 50%"
      );
      expect(
        oldlogicTokenAvailable
          .add(amountBUSDSecondDepositToStorage.mul(5000).div(10000))
          .toString()
      ).to.be.equal(
        newlogicTokenAvailable.toString(),
        "BUSD olaLogic available deposited by 50%"
      );
    });
  });

  describe("Second Build", async () => {
    it("take USDT large amount than divide available", async () => {
      expect(
        await farmLogic.takeTokenFromStorage(
          amountUSDTSecondDepositToStorage.mul(4000).div(10000).toString(),
          USDT.address
        )
      ).to.be.revertedWith("M6");
      expect(
        await olaLogic.takeTokenFromStorage(
          amountUSDTSecondDepositToStorage.mul(4000).div(10000).toString(),
          USDT.address
        )
      ).to.be.revertedWith("M6");
    });
    it("take BUSD large amount than divide available", async () => {
      expect(
        await farmLogic.takeTokenFromStorage(
          amountBUSDSecondDepositToStorage.mul(6000).div(10000).toString(),
          BUSD.address
        )
      ).to.be.revertedWith("M6");
      expect(
        await olaLogic.takeTokenFromStorage(
          amountBUSDSecondDepositToStorage.mul(6000).div(10000).toString(),
          BUSD.address
        )
      ).to.be.revertedWith("M6");
    });

    it("Only owner can build circle", async () => {
      const tx = await expect(
        lblStrategy
          .connect(other)
          .build(
            amountBUSDSecondDepositToStorage.mul(5000).div(10000),
            USDT.address
          )
      ).to.be.revertedWith("OA2");
    });

    it("Token should be inited", async () => {
      const tx = await expect(
        lblStrategy
          .connect(owner)
          .build(
            amountBUSDSecondDepositToStorage.mul(5000).div(10000),
            BANANA.address
          )
      ).to.be.revertedWith("L2");
    });

    it("Build Init with USDT", async () => {
      let oldfarmlogicTokenAvailable = await multiProxy.getTokenAvailable(
        USDT.address,
        farmLogic.address
      );
      let oldlogicTokenAvailable = await multiProxy.getTokenAvailable(
        USDT.address,
        olaLogic.address
      );

      const tx = await lbfStrategy
        .connect(owner)
        .build(
          amountUSDTSecondDepositToStorage.mul(3000).div(10000),
          USDT.address
        );
      await tx.wait(1);

      const tx2 = await lblStrategy
        .connect(owner)
        .build(
          amountUSDTSecondDepositToStorage.mul(7000).div(10000),
          USDT.address
        );
      await tx2.wait(1);

      let farmlogicTokenAvailable = await multiProxy.getTokenAvailable(
        USDT.address,
        farmLogic.address
      );
      let logicTokenAvailable = await multiProxy.getTokenAvailable(
        USDT.address,
        olaLogic.address
      );
      expect(
        farmlogicTokenAvailable
          .add(amountUSDTSecondDepositToStorage.mul(3000).div(10000))
          .toString()
      ).to.be.equal(
        oldfarmlogicTokenAvailable.toString(),
        "USDT farmLogic take Token from storage as 30% second deposited amount"
      );
      expect(
        logicTokenAvailable
          .add(amountUSDTSecondDepositToStorage.mul(7000).div(10000))
          .toString()
      ).to.be.equal(
        oldlogicTokenAvailable.toString(),
        "USDT olaLogic take Token from storage as 70% second deposited amount"
      );
    });
    it("Build Init with BUSD", async () => {
      let oldfarmlogicTokenAvailable = await multiProxy.getTokenAvailable(
        BUSD.address,
        farmLogic.address
      );
      let oldlogicTokenAvailable = await multiProxy.getTokenAvailable(
        BUSD.address,
        olaLogic.address
      );

      const tx = await lbfStrategy
        .connect(owner)
        .build(
          amountBUSDSecondDepositToStorage.mul(5000).div(10000),
          BUSD.address
        );
      await tx.wait(1);

      const tx2 = await lblStrategy
        .connect(owner)
        .build(
          amountBUSDSecondDepositToStorage.mul(5000).div(10000),
          BUSD.address
        );
      await tx2.wait(1);

      let farmlogicTokenAvailable = await multiProxy.getTokenAvailable(
        BUSD.address,
        farmLogic.address
      );
      let logicTokenAvailable = await multiProxy.getTokenAvailable(
        BUSD.address,
        olaLogic.address
      );
      expect(
        farmlogicTokenAvailable
          .add(amountBUSDSecondDepositToStorage.mul(5000).div(10000))
          .toString()
      ).to.be.equal(
        oldfarmlogicTokenAvailable.toString(),
        "BUSD farmLogic take Token from storage as 50% second deposited amount"
      );
      expect(
        logicTokenAvailable
          .add(amountBUSDSecondDepositToStorage.mul(5000).div(10000))
          .toString()
      ).to.be.equal(
        oldlogicTokenAvailable.toString(),
        "BUSD olaLogic take Token from storage as 50% second deposited amount"
      );
    });
  });

  describe("Farm Strategy Claim", async () => {
    it("Only Owner or Admin can process Claim", async () => {
      const tx = await expect(
        lbfStrategy
          .connect(other)
          .claimRewards(USDT.address, minimumBLIDPerRewardToken)
      ).to.be.revertedWith("OA2");
    });

    it("Token should be inited", async () => {
      const tx = await expect(
        lbfStrategy
          .connect(owner)
          .claimRewards(BANANA.address, minimumBLIDPerRewardToken)
      ).to.be.revertedWith("OC2");
    });

    it("Claim Rewards", async () => {
      //await sleep(60000);
      let BLIDOwnerBalance = await storage.balanceEarnBLID(owner.address);
      let BLIDStorageBalance = await BLID.balanceOf(storage.address);
      let BLIDExpenseBalance = await BLID.balanceOf(expenseAddress);

      const tx = await lbfStrategy
        .connect(owner)
        .claimRewards(USDT.address, minimumBLIDPerRewardToken);
      await tx.wait(1);

      let BLIDOwnerBalanceNew = await storage.balanceEarnBLID(owner.address);
      let BLIDStorageBalanceNew = await BLID.balanceOf(storage.address);
      let BLIDExpenseBalanceNew = await BLID.balanceOf(expenseAddress);

      expect(BLIDOwnerBalanceNew).to.be.above(
        BLIDOwnerBalance,
        "BLID balance of Owner should be increased"
      );

      expect(BLIDStorageBalanceNew).to.be.above(
        BLIDStorageBalance,
        "BLID balance of Owner should be increased"
      );

      expect(BLIDExpenseBalanceNew).to.be.above(
        BLIDExpenseBalance,
        "BLID balance of Owner should be increased"
      );
    });

    after(async () => {
      logValue(
        "Farm Strategy BLID Award",
        await storage.balanceEarnBLID(owner.address)
      );
    });
  });

  describe("Ola Strategy Claim", async () => {
    it("Only Owner or Admin can process Claim", async () => {
      const tx = await expect(
        lblStrategy
          .connect(other)
          .claimRewards(USDT.address, minimumBLIDPerRewardToken)
      ).to.be.revertedWith("OA2");
    });

    it("Token should be inited", async () => {
      const tx = await expect(
        lblStrategy
          .connect(owner)
          .claimRewards(BANANA.address, minimumBLIDPerRewardToken)
      ).to.be.revertedWith("OC2");
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

      expect(BLIDOwnerBalanceNew).to.be.above(
        BLIDOwnerBalance,
        "BLID balance of Owner should be increased"
      );

      expect(BLIDStorageBalanceNew).to.be.above(
        BLIDStorageBalance,
        "BLID balance of Owner should be increased"
      );

      expect(BLIDExpenseBalanceNew).to.be.above(
        BLIDExpenseBalance,
        "BLID balance of Owner should be increased"
      );
    });

    after(async () => {
      logValue(
        "Ola Strategy BLID Award",
        await storage.balanceEarnBLID(owner.address)
      );
    });
  });

  describe("Second Destory", async () => {
    it("Second Destory with USDT", async () => {
      let oldfarmlogicTokenBalance = await multiProxy.getTokenAvailable(
        USDT.address,
        farmLogic.address
      );
      let oldlogicTokenBalance = await multiProxy.getTokenAvailable(
        USDT.address,
        olaLogic.address
      );

      const tx = await lbfStrategy.connect(owner).destroy(USDT.address);
      await tx.wait(1);

      const tx2 = await lblStrategy.connect(owner).destroy(USDT.address);
      await tx2.wait(1);

      let newfarmlogicTokenBalance = await multiProxy.getTokenAvailable(
        USDT.address,
        farmLogic.address
      );
      let newlogicTokenBalance = await multiProxy.getTokenAvailable(
        USDT.address,
        olaLogic.address
      );

      expect(
        oldfarmlogicTokenBalance
          .add(
            amountBUSDFirstDepositToStorage
              .mul(3000)
              .div(10000)
              .add(amountBUSDSecondDepositToStorage.mul(3000).div(10000))
          )
          .toString()
      ).to.be.equal(
        newfarmlogicTokenBalance.toString(),
        "USDT farmLogic available should be decreased 30% total deposted amount"
      );
      expect(
        oldlogicTokenBalance
          .add(
            amountBUSDFirstDepositToStorage
              .mul(7000)
              .div(10000)
              .add(amountBUSDSecondDepositToStorage.mul(7000).div(10000))
          )
          .toString()
      ).to.be.equal(
        newlogicTokenBalance.toString(),
        "USDT farmLogic available should be decreased 70% total deposted amount"
      );
    });

    it("Second Destory with BUSD", async () => {
      let oldfarmlogicTokenBalance = await multiProxy.getTokenAvailable(
        BUSD.address,
        farmLogic.address
      );
      let oldlogicTokenBalance = await multiProxy.getTokenAvailable(
        BUSD.address,
        olaLogic.address
      );

      const tx = await lbfStrategy.connect(owner).destroy(BUSD.address);
      await tx.wait(1);

      const tx2 = await lblStrategy.connect(owner).destroy(BUSD.address);
      await tx2.wait(1);

      let newfarmlogicTokenBalance = await multiProxy.getTokenAvailable(
        BUSD.address,
        farmLogic.address
      );
      let newlogicTokenBalance = await multiProxy.getTokenAvailable(
        BUSD.address,
        olaLogic.address
      );

      expect(
        oldfarmlogicTokenBalance
          .add(
            amountBUSDFirstDepositToStorage
              .mul(5000)
              .div(10000)
              .add(amountBUSDSecondDepositToStorage.mul(5000).div(10000))
          )
          .toString()
      ).to.be.equal(
        newfarmlogicTokenBalance.toString(),
        "BUSD farmLogic available should be decreased 50% total deposted amount"
      );
      expect(
        oldlogicTokenBalance
          .add(
            amountBUSDFirstDepositToStorage
              .mul(5000)
              .div(10000)
              .add(amountBUSDSecondDepositToStorage.mul(5000).div(10000))
          )
          .toString()
      ).to.be.equal(
        newlogicTokenBalance.toString(),
        "BUSD farmLogic available should be decreased 50% total deposted amount"
      );
    });
  });

  describe("WithDraw", async () => {
    it("withDraw USDT", async () => {
      await storage.withdraw(
        amountUSDTFirstDepositToStorage.add(amountUSDTSecondDepositToStorage),
        USDT.address
      );

      let farmlogicTokenAvailable = await multiProxy.getTokenAvailable(
        USDT.address,
        farmLogic.address
      );
      let olalogicTokenAvailable = await multiProxy.getTokenAvailable(
        USDT.address,
        olaLogic.address
      );

      expect(farmlogicTokenAvailable).to.be.equal(
        0,
        "USDT farmLogic available should be 0"
      );
      expect(olalogicTokenAvailable).to.be.equal(
        0,
        "USDT olaLogic available should be 0"
      );
    });

    it("withDraw BUSD", async () => {
      await storage.withdraw(
        amountUSDTFirstDepositToStorage.add(amountUSDTSecondDepositToStorage),
        BUSD.address
      );

      let farmlogicTokenAvailable = await multiProxy.getTokenAvailable(
        BUSD.address,
        farmLogic.address
      );
      let olalogicTokenAvailable = await multiProxy.getTokenAvailable(
        BUSD.address,
        olaLogic.address
      );

      expect(farmlogicTokenAvailable).to.be.equal(
        0,
        "BUSD farmLogic available should be 0"
      );
      expect(olalogicTokenAvailable).to.be.equal(
        0,
        "BUSD olaLogic available should be 0"
      );
    });
  });
};
