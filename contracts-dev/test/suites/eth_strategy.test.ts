/*******************************************
 * Test on Rinkeby Testnet
 * Before run test, deploy storage, logic, aggregator contract on mainnet
 * Owner should have at least 1.1 ETH
 *******************************************/

import dotenv from "dotenv";
import {cEthAbi} from "../../data/contracts_abi/compound.json";
import {erc20Abi} from "../../data/contracts_abi/erc20.json";
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
import {logValue} from "../../utils/helpers";
import {ADDRESS_COLLECTION} from "../../data/addresses.json";
import {BigNumber} from "ethers";

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
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Initialize Contract
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

// Variables for deployed contract
let storage: StorageV3,
  logic: Logic,
  lbfStrategy: LendBorrowFarmStrategy,
  multiLogicProxy: MultiLogic;

export const eth_strategy = () => {
  before(async () => {
    logic = Logic__factory.connect(lbfLogicAddress, owner) as Logic;

    lbfStrategy = LendBorrowFarmStrategy__factory.connect(
      lbfStrategyAddress,
      owner
    ) as LendBorrowFarmStrategy;

    storage = StorageV3__factory.connect(storageAddress, owner) as StorageV3;

    multiLogicProxy = MultiLogic__factory.connect(
      multiLogicProxyAddress,
      owner
    ) as MultiLogic;
  });

  describe("Preparation", async () => {
    describe("MuliLogicProxy", async () => {
      xit("Set Strategy address", async () => {
        const multiStrategyLength =
          (await multiLogicProxy.multiStrategyLength()) as BigNumber;

        if (multiStrategyLength.eq("0")) {
          const tx = await multiLogicProxy.connect(owner).initStrategies(
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
            ]
          );
          await tx.wait(1);
        } else {
          const tx = await multiLogicProxy.connect(owner).addStrategy(
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

      it("Set Percentages", async () => {
        await multiLogicProxy
          .connect(owner)
          .setPercentages(ZERO_ADDRESS, [7000, 3000]);
      });
    });

    xdescribe("Init BNB with Strategy", async () => {
      it("Init Tokens (xBNB/BNB)", async () => {
        const tx = await lbfStrategy
          .connect(owner)
          .addVToken(ZERO_ADDRESS, xBNB.address);
        await tx.wait(1);
      });
    });
  });

  describe("Step 1 - BNB to Logic", async () => {
    before(async () => {
      logValue(
        "Logic   balance in BNB",
        await provider.getBalance(logic.address)
      );
      logValue(
        "Storage balance in BNB",
        await provider.getBalance(storage.address)
      );
      logValue(
        "Proxy   balance in BNB",
        await provider.getBalance(multiLogicProxy.address)
      );
    });
    after(async () => {
      logValue(
        "Logic   balance in BNB",
        await provider.getBalance(logic.address)
      );
      logValue(
        "Storage balance in BNB",
        await provider.getBalance(storage.address)
      );
      logValue(
        "Proxy   balance in BNB",
        await provider.getBalance(multiLogicProxy.address)
      );
    });

    xit("Add BNB to storage", async () => {
      const tx = await storage
        .connect(owner)
        .addToken(ZERO_ADDRESS, ADDRESSES.CHAINLINK.USDT);
      await tx.wait(1);
    });

    it("Deposit 1 BNB from owner to storage", async () => {
      let balanceBNBOwner = await provider.getBalance(owner.address);
      let balanceBNBStorage = await provider.getBalance(storage.address);
      let tokenBalance = await storage
        .connect(owner)
        .getTokenBalance(ZERO_ADDRESS);
      let tokenDeposit = await storage
        .connect(owner)
        .getTokenDeposit(owner.address, ZERO_ADDRESS);
      let tokenDepositTotal = await storage
        .connect(owner)
        .getTokenDeposited(ZERO_ADDRESS);

      const tx = await storage
        .connect(owner)
        .deposit(ethers.utils.parseEther("1"), ZERO_ADDRESS, {
          from: owner.address,
          value: ethers.utils.parseEther("1").toString(),
        });
      await tx.wait(1);

      let balanceBNBOwnerNew = await provider.getBalance(owner.address);
      let balanceBNBStorageNew = await provider.getBalance(storage.address);
      let tokenBalanceNew = await storage
        .connect(owner)
        .getTokenBalance(ZERO_ADDRESS);
      let tokenDepositNew = await storage
        .connect(owner)
        .getTokenDeposit(owner.address, ZERO_ADDRESS);
      let tokenDepositTotalNew = await storage
        .connect(owner)
        .getTokenDeposited(ZERO_ADDRESS);

      expect(balanceBNBOwnerNew.lt(balanceBNBOwner)).to.be.eql(
        true,
        "BNB balance of owner should be decreased"
      );
      expect(
        balanceBNBStorage.add(ethers.utils.parseEther("1")).toString()
      ).to.be.eql(
        balanceBNBStorageNew.toString(),
        "BNB balance of storage should be increased by 1"
      );
      expect(
        tokenBalance.add(ethers.utils.parseEther("1")).toString()
      ).to.be.eql(
        tokenBalanceNew.toString(),
        "token balance of storage should be increased by 1"
      );
      expect(
        tokenDeposit.add(ethers.utils.parseEther("1")).toString()
      ).to.be.eql(
        tokenDepositNew.toString(),
        "token deposit of storage should be increased by 1"
      );
      expect(
        tokenDepositTotal.add(ethers.utils.parseEther("1")).toString()
      ).to.be.eql(
        tokenDepositTotalNew.toString(),
        "token deposit total of storage should be increased by 1"
      );
    });

    it("Take 0.7 BNB from Storage", async () => {
      let balanceBNBLogic = await provider.getBalance(logic.address);
      let balanceBNBStorage = await provider.getBalance(storage.address);
      let tokenBalance = await storage
        .connect(owner)
        .getTokenBalance(ZERO_ADDRESS);
      let tokenDeposit = await storage
        .connect(owner)
        .getTokenDeposit(owner.address, ZERO_ADDRESS);
      let tokenDepositTotal = await storage
        .connect(owner)
        .getTokenDeposited(ZERO_ADDRESS);

      const tx = await logic.takeTokenFromStorage(
        ethers.utils.parseEther("0.7"),
        ZERO_ADDRESS
      );
      await tx.wait(1);

      let balanceBNBLogicNew = await provider.getBalance(logic.address);
      let balanceBNBStorageNew = await provider.getBalance(storage.address);
      let tokenBalanceNew = await storage
        .connect(owner)
        .getTokenBalance(ZERO_ADDRESS);
      let tokenDepositNew = await storage
        .connect(owner)
        .getTokenDeposit(owner.address, ZERO_ADDRESS);
      let tokenDepositTotalNew = await storage
        .connect(owner)
        .getTokenDeposited(ZERO_ADDRESS);

      expect(
        balanceBNBStorageNew.add(ethers.utils.parseEther("0.7")).toString()
      ).to.be.eql(
        balanceBNBStorage.toString(),
        "BNB balance of storage should be decreased by 0.7"
      );
      expect(
        balanceBNBLogic.add(ethers.utils.parseEther("0.7")).toString()
      ).to.be.eql(
        balanceBNBLogicNew.toString(),
        "BNB balance of logic should be increased by 0.7"
      );
      expect(
        tokenBalance.sub(ethers.utils.parseEther("0.7")).toString()
      ).to.be.eql(
        tokenBalanceNew.toString(),
        "token balance of storage should be decreased by 0.7"
      );
      expect(tokenDeposit.eq(tokenDepositNew)).to.be.eql(
        true,
        "token deposit of storage should unchanged"
      );
      expect(tokenDepositTotal.eq(tokenDepositTotalNew)).to.be.eql(
        true,
        "token deposit total of storage should be unchanged"
      );
    });

    it("Withdraw 0.4 BNB from storage to owner", async () => {
      let balanceBNBOwner = await provider.getBalance(owner.address);
      let balanceBNBLogic = await provider.getBalance(logic.address);
      let tokenBalance = await storage
        .connect(owner)
        .getTokenBalance(ZERO_ADDRESS);
      let tokenDeposit = await storage
        .connect(owner)
        .getTokenDeposit(owner.address, ZERO_ADDRESS);
      let tokenDepositTotal = await storage
        .connect(owner)
        .getTokenDeposited(ZERO_ADDRESS);

      const tx = await storage
        .connect(owner)
        .withdraw(ethers.utils.parseEther("0.4").toString(), ZERO_ADDRESS);
      await tx.wait(1);

      let balanceBNBOwnerNew = await provider.getBalance(owner.address);
      let balanceBNBLogicNew = await provider.getBalance(logic.address);
      let tokenBalanceNew = await storage
        .connect(owner)
        .getTokenBalance(ZERO_ADDRESS);
      let tokenDepositNew = await storage
        .connect(owner)
        .getTokenDeposit(owner.address, ZERO_ADDRESS);
      let tokenDepositTotalNew = await storage
        .connect(owner)
        .getTokenDeposited(ZERO_ADDRESS);

      expect(balanceBNBOwner.lt(balanceBNBOwnerNew)).to.be.eql(
        true,
        "BNB balance of owner should be increased"
      );
      expect(
        balanceBNBLogicNew.add(ethers.utils.parseEther("0.1")).toString()
      ).to.be.eql(
        balanceBNBLogic.toString(),
        "BNB balance of logic should be decreased by 0.1"
      );
      expect(
        tokenBalance.sub(ethers.utils.parseEther("0.3")).toString()
      ).to.be.eql(
        tokenBalanceNew.toString(),
        "token balance of storage should be decreased by 0.3"
      );
      expect(
        tokenDeposit.sub(ethers.utils.parseEther("0.4")).toString()
      ).to.be.eql(
        tokenDepositNew.toString(),
        "token deposit of storage should be decreased by 0.4"
      );
      expect(
        tokenDepositTotal.sub(ethers.utils.parseEther("0.4")).toString()
      ).to.be.eql(
        tokenDepositTotalNew.toString(),
        "token deposit total of storage should be decreased by 0.4"
      );
    });

    it("Return 0.1 BNB from Logic to Storage", async () => {
      let balanceBNBLogic = await provider.getBalance(logic.address);
      let balanceBNBStorage = await provider.getBalance(storage.address);
      let tokenBalance = await storage
        .connect(owner)
        .getTokenBalance(ZERO_ADDRESS);
      let tokenDeposit = await storage
        .connect(owner)
        .getTokenDeposit(owner.address, ZERO_ADDRESS);
      let tokenDepositTotal = await storage
        .connect(owner)
        .getTokenDeposited(ZERO_ADDRESS);

      const tx = await logic.returnTokenToStorage(
        ethers.utils.parseEther("0.1"),
        ZERO_ADDRESS
      );
      await tx.wait(1);

      let balanceBNBLogicNew = await provider.getBalance(logic.address);
      let balanceBNBStorageNew = await provider.getBalance(storage.address);
      let tokenBalanceNew = await storage
        .connect(owner)
        .getTokenBalance(ZERO_ADDRESS);
      let tokenDepositNew = await storage
        .connect(owner)
        .getTokenDeposit(owner.address, ZERO_ADDRESS);
      let tokenDepositTotalNew = await storage
        .connect(owner)
        .getTokenDeposited(ZERO_ADDRESS);

      expect(
        balanceBNBStorage.add(ethers.utils.parseEther("0.1")).toString()
      ).to.be.eql(
        balanceBNBStorageNew.toString(),
        "BNB balance of storage should be increased by 0.1"
      );
      expect(
        balanceBNBLogicNew.add(ethers.utils.parseEther("0.1")).toString()
      ).to.be.eql(
        balanceBNBLogic.toString(),
        "BNB balance of logic should be decreased by 0.1"
      );
      expect(
        tokenBalance.add(ethers.utils.parseEther("0.1")).toString()
      ).to.be.eql(
        tokenBalanceNew.toString(),
        "token balance of storage should be increased by 0.1"
      );
      expect(tokenDeposit.eq(tokenDepositNew)).to.be.eql(
        true,
        "token deposit of storage should unchanged"
      );
      expect(tokenDepositTotal.eq(tokenDepositTotalNew)).to.be.eql(
        true,
        "token deposit total of storage should be unchanged"
      );
    });
  });

  describe("Step 2 - Mint/Redeem", async () => {
    xdescribe("Mint", async () => {
      it("mint xBNB for Logic with 0.5 BNB", async () => {
        let balanceBNBLogic = await provider.getBalance(logic.address);
        let balanceXBNBLogic = await xBNB.balanceOf(logic.address);

        const tx = await logic
          .connect(owner)
          .mint(xBNB.address, ethers.utils.parseEther("0.5").toString());
        await tx.wait(1);

        let balanceBNBLogicNew = await provider.getBalance(logic.address);
        let balanceXBNBLogicNew = await xBNB.balanceOf(logic.address);

        expect(
          balanceBNBLogicNew.add(ethers.utils.parseEther("0.5")).toString()
        ).to.be.eql(
          balanceBNBLogic.toString(),
          "BNB balance of logic should be decreased by 0.5"
        );
        expect(balanceXBNBLogicNew.gt(balanceXBNBLogic)).to.be.eql(
          true,
          "xBNB balance of logic should be increased"
        );
      });

      after(async () => {
        logValue(
          "Logic   balance in xBNB",
          await xBNB.balanceOf(logic.address)
        );
        logValue(
          "Logic   balance in BNB",
          await provider.getBalance(logic.address)
        );
      });
    });

    describe("RedeemUnderlying", async () => {
      it("redeemUnderlying for xBNB", async () => {
        let balanceBNBLogic = await provider.getBalance(logic.address);
        let balanceXBNBLogic = await xBNB.balanceOf(logic.address);

        const tx = await logic
          .connect(owner)
          .redeemUnderlying(
            xBNB.address,
            ethers.utils.parseEther("0.5").toString()
          );
        await tx.wait(1);

        let balanceBNBLogicNew = await provider.getBalance(logic.address);
        let balanceXBNBLogicNew = await xBNB.balanceOf(logic.address);

        expect(
          balanceBNBLogic.add(ethers.utils.parseEther("0.5")).toString()
        ).to.be.eql(
          balanceBNBLogicNew.toString(),
          "BNB balance of logic should be increased by 0.5"
        );
        expect(balanceXBNBLogicNew.lt(balanceXBNBLogic)).to.be.eql(
          true,
          "xBNB balance of logic should be decreased"
        );
      });

      after(async () => {
        logValue(
          "Logic   balance in xBNB",
          await xBNB.balanceOf(logic.address)
        );
        logValue(
          "Logic   balance in BNB",
          await provider.getBalance(logic.address)
        );
      });
    });
  });

  describe("Step 3 - withdraw", async () => {
    before(async () => {
      logValue(
        "Logic   balance in BNB",
        await provider.getBalance(logic.address)
      );
      logValue(
        "Storage balance in BNB",
        await provider.getBalance(storage.address)
      );
      logValue(
        "Proxy   balance in BNB",
        await provider.getBalance(multiLogicProxy.address)
      );
    });
    after(async () => {
      logValue(
        "Logic   balance in BNB",
        await provider.getBalance(logic.address)
      );
      logValue(
        "Storage balance in BNB",
        await provider.getBalance(storage.address)
      );
      logValue(
        "Proxy   balance in BNB",
        await provider.getBalance(multiLogicProxy.address)
      );
    });

    it("Withdraw 0.4 USDT from storage to owner", async () => {
      let balanceBNBOwner = await provider.getBalance(owner.address);
      let balanceBNBStorage = await provider.getBalance(storage.address);
      let balanceBNBLogic = await provider.getBalance(logic.address);

      const tx = await storage
        .connect(owner)
        .withdraw(ethers.utils.parseEther("0.4").toString(), ZERO_ADDRESS);
      await tx.wait(1);

      let balanceBNBOwnerNew = await provider.getBalance(owner.address);
      let balanceBNBStorageNew = await provider.getBalance(storage.address);
      let balanceBNBLogicNew = await provider.getBalance(logic.address);

      expect(balanceBNBOwner.lt(balanceBNBOwnerNew)).to.be.eql(
        true,
        "BNB balance of owner should be increased"
      );
      expect(
        balanceBNBStorage.sub(ethers.utils.parseEther("0.1")).toString()
      ).to.be.eql(
        balanceBNBStorageNew.toString(),
        "BNB balance of storage should be decreased by 0.1"
      );
      expect(
        balanceBNBLogic.sub(ethers.utils.parseEther("0.3")).toString()
      ).to.be.eql(
        balanceBNBLogicNew.toString(),
        "BNB balance of storage should be decreased by 0.3"
      );
    });

    it("Withdraw 0.2 USDT from storage to owner", async () => {
      let balanceBNBOwner = await provider.getBalance(owner.address);
      let balanceBNBStorage = await provider.getBalance(storage.address);
      let balanceBNBLogic = await provider.getBalance(logic.address);

      const tx = await storage
        .connect(owner)
        .withdraw(ethers.utils.parseEther("0.2").toString(), ZERO_ADDRESS);
      await tx.wait(1);

      let balanceBNBOwnerNew = await provider.getBalance(owner.address);
      let balanceBNBStorageNew = await provider.getBalance(storage.address);
      let balanceBNBLogicNew = await provider.getBalance(logic.address);

      expect(balanceBNBOwner.lt(balanceBNBOwnerNew)).to.be.eql(
        true,
        "BNB balance of owner should be increased"
      );
      expect(balanceBNBStorage.eq(balanceBNBStorageNew)).to.be.eql(
        true,
        "BNB balance of storage should be unchanged"
      );
      expect(
        balanceBNBLogic.sub(ethers.utils.parseEther("0.2")).toString()
      ).to.be.eql(
        balanceBNBLogicNew.toString(),
        "BNB balance of storage should be decreased by 0.2"
      );
    });
  });
};
