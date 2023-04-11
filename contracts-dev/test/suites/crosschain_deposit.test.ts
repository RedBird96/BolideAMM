/*******************************************
 * Test on Rinkeby testnet, BSC testnet
 *******************************************/

import {ethers} from "hardhat";
import {erc20Abi} from "../../data/contracts_abi/erc20.json";
import {
  IERC20Upgradeable,
  StorageV3,
  CrossChainDepositor,
  CrossChainDepositor__factory,
  StorageV3__factory,
  AccumulatedDepositor,
  AccumulatedDepositor__factory,
} from "../../typechain-types";
import {expect} from "chai";
import {STARGATE_COLLECTION} from "../../data/addresses.json";
import {BigNumber} from "ethers";
import {logValue} from "../../utils/helpers";

const isTest = false;

// Privider for src, dst chain
const provider_src = new ethers.providers.JsonRpcProvider(
  isTest
    ? process.env.TESTNET_RINKEBY_PROVIDER_URL
    : process.env.MAINNET_POLYGON_PROVIDER_URL,
  isTest ? {name: "rinkeby", chainId: 4} : {name: "polygon", chainId: 137}
);
const provider_dst = new ethers.providers.JsonRpcProvider(
  isTest
    ? process.env.TESTNET_BSC_PROVIDER_URL
    : process.env.MAINNET_BSC_PROVIDER_URL,
  isTest ? {name: "binance", chainId: 97} : {name: "binance", chainId: 56}
);

// Your wallet
const owner_src = process.env.PRIVATE_KEY
  ? new ethers.Wallet(process.env.PRIVATE_KEY!, provider_src)
  : ethers.Wallet.createRandom();
const other_src = process.env.PRIVATE_KEY_TEST
  ? new ethers.Wallet(process.env.PRIVATE_KEY_TEST!, provider_src)
  : ethers.Wallet.createRandom();
const owner_dst = process.env.PRIVATE_KEY
  ? new ethers.Wallet(process.env.PRIVATE_KEY!, provider_dst)
  : ethers.Wallet.createRandom();
const other_dst = process.env.PRIVATE_KEY_TEST
  ? new ethers.Wallet(process.env.PRIVATE_KEY_TEST!, provider_dst)
  : ethers.Wallet.createRandom();

// Deployed contract address
const ethDepositorAddress = process.env.CROSSCHAIN_DEPOSITOR_ADDRESS!;
const bscDepositorAddress = process.env.ACCUMULATED_DEPOSITOR_ADDRESS!;
const storageAddress = process.env.STORAGE_PROXY_ADDRESS!;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Stargate information
const srcChainId = isTest
  ? STARGATE_COLLECTION.mumbai.chainId
  : STARGATE_COLLECTION.polygon.chainId;
const srcTokenAddress = isTest
  ? STARGATE_COLLECTION.mumbai.token.USDC.address
  : STARGATE_COLLECTION.polygon.token.USDC.address;
const srcTokenPoolId = isTest
  ? STARGATE_COLLECTION.mumbai.token.USDC.poolId
  : STARGATE_COLLECTION.polygon.token.USDC.poolId;
const dstChainId = isTest
  ? STARGATE_COLLECTION.bscTestnet.chainId
  : STARGATE_COLLECTION.bsc.chainId;
const dstTokenAddress = isTest
  ? STARGATE_COLLECTION.bscTestnet.token.USDT.address
  : STARGATE_COLLECTION.bsc.token.USDT.address;
const dstTokenPoolId = isTest
  ? STARGATE_COLLECTION.bscTestnet.token.USDT.poolId
  : STARGATE_COLLECTION.bsc.token.USDT.poolId;

// Test value
const amountDeposit = ethers.utils.parseEther("0.000000001");
const dstGasForCall = "2000000";

export const crosschain_deposit = () => {
  let storage: StorageV3,
    srcDepositor: CrossChainDepositor,
    dstDepositor: AccumulatedDepositor,
    srcToken: IERC20Upgradeable,
    dstToken: IERC20Upgradeable;

  before(async () => {
    srcDepositor = CrossChainDepositor__factory.connect(
      ethDepositorAddress,
      owner_src
    );

    dstDepositor = AccumulatedDepositor__factory.connect(
      bscDepositorAddress,
      owner_dst
    );

    storage = StorageV3__factory.connect(storageAddress, owner_dst);

    srcToken = new ethers.Contract(
      srcTokenAddress,
      erc20Abi,
      owner_src
    ) as IERC20Upgradeable;

    dstToken = new ethers.Contract(
      dstTokenAddress,
      erc20Abi,
      owner_dst
    ) as IERC20Upgradeable;
  });

  describe("Chain 1 - CrossChainDepositor", async () => {
    describe("Set AccumulatedDepositor", async () => {
      it("only owner can set AccumulatedDepositor", async () => {
        await expect(
          srcDepositor
            .connect(other_src)
            .setAccumulatedDepositor(bscDepositorAddress)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Set AccumulatedDepositor", async () => {
        const tx = await srcDepositor
          .connect(owner_src)
          .setAccumulatedDepositor(bscDepositorAddress);
        await tx.wait(1);
      });
    });

    describe("Add Stargate Token", async () => {
      it("Only owner can add Stargate token", async () => {
        await expect(
          srcDepositor
            .connect(other_src)
            .addStargateToken(srcTokenAddress, srcTokenPoolId)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Token Address can't be empty", async () => {
        await expect(
          srcDepositor
            .connect(owner_src)
            .addStargateToken(ZERO_ADDRESS, srcTokenPoolId)
        ).to.be.revertedWith("CD2");
      });

      it("Add src token", async () => {
        await srcDepositor
          .connect(owner_src)
          .addStargateToken(srcTokenAddress, srcTokenPoolId);
      });

      it("Add dst token", async () => {
        await srcDepositor
          .connect(owner_src)
          .addStargateToken(dstTokenAddress, dstTokenPoolId);
      });

      it("Cannot add token twice", async () => {
        await expect(
          srcDepositor
            .connect(owner_src)
            .addStargateToken(srcTokenAddress, srcTokenPoolId)
        ).to.be.revertedWith("CD3");
      });
    });
  });

  describe("Chain 2", async () => {
    describe("Add Stargate Token to AccumulatedDepositor", async () => {
      it("Only owner can add Stargate token", async () => {
        await expect(
          dstDepositor.connect(other_dst).addStargateToken(dstTokenAddress)
        ).to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("Token Address can't be empty", async () => {
        await expect(
          dstDepositor.connect(owner_dst).addStargateToken(ZERO_ADDRESS)
        ).to.be.revertedWith("AD3");
      });

      it("Add token", async () => {
        await dstDepositor.connect(owner_dst).addStargateToken(dstTokenAddress);
      });

      it("Cannot add token twice", async () => {
        await expect(
          dstDepositor.connect(owner_dst).addStargateToken(dstTokenAddress)
        ).to.be.revertedWith("AD4");
      });
    });

    describe("Storage", async () => {
      it("Add token", async () => {
        const tx = await storage
          .connect(owner_dst)
          .addToken(dstTokenAddress, process.env.AGGREGATOR_ADDRESS!);
        await tx.wait(1);
      });
    });
  });

  describe("Deposit Remote", async () => {
    let depositFee: BigNumber;

    it("Get deposit fee", async () => {
      depositFee = await srcDepositor
        .connect(owner_src)
        .getDepositFeeStargate(dstChainId, dstGasForCall);
      logValue("Required Fee", depositFee);
    });

    it("Approve src Token", async () => {
      const tx = await srcToken
        .connect(owner_src)
        .approve(srcDepositor.address, amountDeposit);
      await tx.wait(1);
    });

    it("src Token should be added", async () => {
      await expect(
        srcDepositor
          .connect(owner_src)
          .depositStarGate(
            dstChainId,
            other_src.address,
            dstToken.address,
            amountDeposit,
            0,
            dstGasForCall
          )
      ).to.be.revertedWith("CD1");
    });

    it("dst Token should be added", async () => {
      await expect(
        srcDepositor
          .connect(owner_src)
          .depositStarGate(
            dstChainId,
            srcToken.address,
            other_src.address,
            amountDeposit,
            0,
            dstGasForCall
          )
      ).to.be.revertedWith("CD1");
    });

    it("Some eth is required", async () => {
      await expect(
        srcDepositor
          .connect(owner_src)
          .depositStarGate(
            dstChainId,
            srcToken.address,
            dstToken.address,
            amountDeposit,
            0,
            dstGasForCall
          )
      ).to.be.revertedWith("CD5");
    });

    it("deposit amount should be > 0", async () => {
      await expect(
        srcDepositor
          .connect(owner_src)
          .depositStarGate(
            dstChainId,
            srcToken.address,
            dstToken.address,
            "0",
            "0",
            dstGasForCall,
            {value: depositFee.div(2).toString()}
          )
      ).to.be.revertedWith("CD6");
    });

    it("Should send enough eth gas fee", async () => {
      await expect(
        srcDepositor
          .connect(owner_src)
          .depositStarGate(
            dstChainId,
            srcToken.address,
            dstToken.address,
            amountDeposit,
            0,
            dstGasForCall,
            {value: depositFee.div(2).toString()}
          )
      ).to.be.revertedWith("CD7");
    });

    it("Destination chain id should be exist", async () => {
      await expect(
        srcDepositor
          .connect(owner_src)
          .depositStarGate(
            "99",
            srcToken.address,
            dstToken.address,
            amountDeposit,
            0,
            dstGasForCall,
            {value: depositFee.toString()}
          )
      ).to.be.reverted;
    });

    it("amountOutMin should be correct amount", async () => {
      await expect(
        srcDepositor
          .connect(owner_src)
          .depositStarGate(
            dstChainId,
            srcToken.address,
            dstToken.address,
            amountDeposit,
            ethers.utils.parseEther("10000"),
            dstGasForCall,
            {value: depositFee.toString()}
          )
      ).to.be.reverted;
    });

    it("Deposit successfully", async () => {
      const tx = await srcDepositor
        .connect(owner_src)
        .depositStarGate(
          dstChainId,
          srcToken.address,
          dstToken.address,
          amountDeposit,
          0,
          dstGasForCall,
          {value: depositFee.toString()}
        );

      await tx.wait(1);
    });
  });
};
