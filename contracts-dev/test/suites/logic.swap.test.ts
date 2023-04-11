/*******************************************
 * Test on BSC Testnet
 * Before run test, deploy logic contract on testnet
 * Logic contract should have 0.1 BNB
 *******************************************/

import dotenv from "dotenv";
import {ethers} from "hardhat";
import {expect} from "chai";
import {time} from "@openzeppelin/test-helpers";
import {erc20Abi} from "../../data/contracts_abi/erc20.json";
import {ADDRESS_COLLECTION} from "../../data/addresses.json";
import {
  Logic,
  Bolide,
  Logic__factory,
  Bolide__factory,
} from "../../typechain-types";
dotenv.config();

const provider = new ethers.providers.JsonRpcProvider(
  process.env.TESTNET_BSC_PROVIDER_URL,
  {name: "binance", chainId: 97}
);

// Load Addresses
const ADDRESSES = ADDRESS_COLLECTION.bscTestnet;

// Your Ethereum wallet private key
const owner = process.env.PRIVATE_KEY
  ? new ethers.Wallet(process.env.PRIVATE_KEY!, provider)
  : ethers.Wallet.createRandom();
const other = process.env.PRIVATE_KEY_TEST
  ? new ethers.Wallet(process.env.PRIVATE_KEY_TEST!, provider)
  : ethers.Wallet.createRandom();

// Testnet deployed Contract address
const logicAddress = "0x2CA73AcFF1e40008fA7a56Ab2a58F813bB3F0979"; // Testnet
const bolideAddress = "0x69982234CC74c2696b4A7d1D9702926A48775C28"; // Testnet

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
const WBNB = new ethers.Contract(
  ADDRESSES.Token.BNB.Underlying,
  erc20Abi,
  owner
);

// Variables for deployed contract
let logic: Logic, bolide: Bolide;
let startTime: typeof time;
// Test Amount
const swapExactETH = ethers.utils.parseEther("0.0001").toString();
const swapExactBUSD = ethers.utils.parseEther("1").toString();

export const logic_swap = () => {
  before(async () => {
    logic = Logic__factory.connect(logicAddress, owner) as Logic;

    bolide = Bolide__factory.connect(bolideAddress, owner) as Bolide;
  });

  xdescribe("Preparation", async () => {
    it("Approve swap for WBNB", async () => {
      await logic.connect(owner).approveTokenForSwap(WBNB.address);
    });

    it("Approve swap for USDT", async () => {
      await logic.connect(owner).approveTokenForSwap(USDT.address);
    });

    it("Approve swap for BUSD", async () => {
      await logic.connect(owner).approveTokenForSwap(BUSD.address);
    });
  });

  xdescribe("Pancakeswap", async () => {
    describe("swapExactETHForTokens", async () => {
      it("Only admin or owner can process swap", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(other)
            .swapExactETHForTokens(
              ADDRESSES.PancakeRouter,
              swapExactETH,
              0,
              [WBNB.address, USDT.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: OA2"');
      });

      it("Only allowed swap address", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .swapExactETHForTokens(
              other.address,
              swapExactETH,
              0,
              [WBNB.address, USDT.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: E3"');
      });

      it("ETH path should be matched", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .swapExactETHForTokens(
              ADDRESSES.PancakeRouter,
              swapExactETH,
              0,
              [other.address, USDT.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith(
          '"reason":"execution reverted: PancakeRouter: INVALID_PATH"'
        );
      });

      it("Pool for token should be exist", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .swapExactETHForTokens(
              ADDRESSES.PancakeRouter,
              swapExactETH,
              0,
              [WBNB.address, other.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.reverted;
      });

      it("Cannot swap more than ETH balance", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .swapExactETHForTokens(
              ADDRESSES.PancakeRouter,
              ethers.utils.parseEther("100").toString(),
              0,
              [WBNB.address, BUSD.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.reverted;
      });

      it("Cannot swap less than in token minumum", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .swapExactETHForTokens(
              ADDRESSES.PancakeRouter,
              swapExactETH,
              ethers.utils.parseEther("10000").toString(),
              [WBNB.address, BUSD.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.reverted;
      });

      it("swap BNB for BUSD", async () => {
        startTime = await time.latest();

        let balanceBNB = await provider.getBalance(logic.address);
        let balanceBUSD = await BUSD.balanceOf(logic.address);

        const tx = await logic
          .connect(owner)
          .swapExactETHForTokens(
            ADDRESSES.PancakeRouter,
            swapExactETH,
            0,
            [WBNB.address, BUSD.address],
            startTime.add(time.duration.minutes(10)).toString()
          );
        await tx.wait(1);

        let balanceBNBNew = await provider.getBalance(logic.address);
        let balanceBUSDNew = await BUSD.balanceOf(logic.address);

        expect(balanceBUSDNew.gt(balanceBUSD)).to.be.eql(
          true,
          "BUSD balance of logic should be increased"
        );
        expect(balanceBNBNew.lt(balanceBNB)).to.be.eql(
          true,
          "BNB balance of logic should be decreased"
        );
      });
    });

    describe("swapExactTokensForTokens", async () => {
      it("Only admin or owner can process swap", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(other)
            .swapExactTokensForTokens(
              ADDRESSES.PancakeRouter,
              ethers.utils.parseEther("1").toString(),
              0,
              [BUSD.address, USDT.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: OA2"');
      });

      it("Only allowed swap address", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .swapExactTokensForTokens(
              other.address,
              ethers.utils.parseEther("1").toString(),
              0,
              [BUSD.address, USDT.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: E3"');
      });

      it("Pool for tokens should be exist", async () => {
        startTime = await time.latest();
        await expect(
          logic
            .connect(owner)
            .swapExactTokensForTokens(
              ADDRESSES.PancakeRouter,
              ethers.utils.parseEther("1").toString(),
              0,
              [other.address, USDT.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.reverted;

        await expect(
          logic
            .connect(owner)
            .swapExactTokensForTokens(
              ADDRESSES.PancakeRouter,
              ethers.utils.parseEther("1").toString(),
              0,
              [BUSD.address, other.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.reverted;
      });

      it("Cannot swap more than token balance", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .swapExactTokensForTokens(
              ADDRESSES.PancakeRouter,
              ethers.utils.parseEther("100").toString(),
              0,
              [BUSD.address, USDT.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith(
          '"reason":"execution reverted: TransferHelper::transferFrom: transferFrom failed"'
        );
      });

      it("Cannot swap less in token minumum", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .swapExactTokensForTokens(
              ADDRESSES.PancakeRouter,
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("10000").toString(),
              [BUSD.address, USDT.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith(
          '"reason":"execution reverted: PancakeRouter: INSUFFICIENT_OUTPUT_AMOUNT"'
        );
      });

      it("swap BUSD for USDT", async () => {
        startTime = await time.latest();

        let balanceBUSD = await BUSD.balanceOf(logic.address);
        let balanceUSDT = await USDT.balanceOf(logic.address);

        const tx = await logic
          .connect(owner)
          .swapExactTokensForTokens(
            ADDRESSES.PancakeRouter,
            ethers.utils.parseEther("0.1").toString(),
            0,
            [BUSD.address, USDT.address],
            startTime.add(time.duration.minutes(10)).toString()
          );
        await tx.wait(1);

        let balanceBUSDNew = await BUSD.balanceOf(logic.address);
        let balanceUSDTNew = await USDT.balanceOf(logic.address);

        expect(
          balanceBUSDNew.add(ethers.utils.parseEther("0.1")).toString()
        ).to.be.eql(
          balanceBUSD.toString(),
          "BUSD balance of logic should be decreased by " +
            ethers.utils.parseEther("1").toString()
        );
        expect(balanceUSDTNew.gt(balanceUSDT)).to.be.eql(
          true,
          "USDT balance of logic should be increased"
        );
      });
    });

    describe("swapExactTokensForETH", async () => {
      it("Only admin or owner can process swap", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(other)
            .swapExactTokensForETH(
              ADDRESSES.PancakeRouter,
              ethers.utils.parseEther("1").toString(),
              0,
              [BUSD.address, WBNB.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: OA2"');
      });

      it("Only allowed swap address", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .swapExactTokensForETH(
              other.address,
              ethers.utils.parseEther("1").toString(),
              0,
              [BUSD.address, WBNB.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: E3"');
      });

      it("ETH path should be matched", async () => {
        startTime = await time.latest();
        await expect(
          logic
            .connect(owner)
            .swapExactTokensForETH(
              ADDRESSES.PancakeRouter,
              ethers.utils.parseEther("1").toString(),
              0,
              [BUSD.address, other.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith(
          '"reason":"execution reverted: PancakeRouter: INVALID_PATH"'
        );
      });

      it("Pool for token should be exist", async () => {
        startTime = await time.latest();
        await expect(
          logic
            .connect(owner)
            .swapExactTokensForETH(
              ADDRESSES.PancakeRouter,
              ethers.utils.parseEther("1").toString(),
              0,
              [other.address, WBNB.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.reverted;
      });

      it("Cannot swap more than token balance", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .swapExactTokensForETH(
              ADDRESSES.PancakeRouter,
              ethers.utils.parseEther("100").toString(),
              0,
              [BUSD.address, WBNB.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith(
          '"reason":"execution reverted: TransferHelper::transferFrom: transferFrom failed"'
        );
      });

      it("Cannot swap less than ETH mininum", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .swapExactTokensForETH(
              ADDRESSES.PancakeRouter,
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("100000").toString(),
              [BUSD.address, WBNB.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith(
          '"reason":"execution reverted: PancakeRouter: INSUFFICIENT_OUTPUT_AMOUNT"'
        );
      });

      it("swap BUSD for BNB", async () => {
        startTime = await time.latest();

        let balanceBUSD = await BUSD.balanceOf(logic.address);
        let balanceBNB = await provider.getBalance(logic.address);

        const tx = await logic
          .connect(owner)
          .swapExactTokensForETH(
            ADDRESSES.PancakeRouter,
            ethers.utils.parseEther("0.01").toString(),
            0,
            [BUSD.address, WBNB.address],
            startTime.add(time.duration.minutes(10)).toString()
          );
        await tx.wait(1);

        let balanceBUSDNew = await BUSD.balanceOf(logic.address);
        let balanceBNBNew = await provider.getBalance(logic.address);

        expect(
          balanceBUSDNew.add(ethers.utils.parseEther("0.01")).toString()
        ).to.be.eql(
          balanceBUSD.toString(),
          "BUSD balance of logic should be decreased by " +
            ethers.utils.parseEther("1").toString()
        );
        expect(balanceBNBNew.gt(balanceBNB)).to.be.eql(
          true,
          "BNB balance of logic should be increased"
        );
      });
    });

    describe("swapETHForExactTokens", async () => {
      it("Only admin or owner can process swap", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(other)
            .swapETHForExactTokens(
              ADDRESSES.PancakeRouter,
              swapExactETH,
              swapExactBUSD,
              [WBNB.address, USDT.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: OA2"');
      });

      it("Only allowed swap address", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .swapETHForExactTokens(
              other.address,
              swapExactETH,
              swapExactBUSD,
              [WBNB.address, USDT.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: E3"');
      });

      it("ETH path should be matched", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .swapETHForExactTokens(
              ADDRESSES.PancakeRouter,
              swapExactETH,
              swapExactBUSD,
              [other.address, USDT.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith(
          '"reason":"execution reverted: PancakeRouter: INVALID_PATH"'
        );
      });

      it("Pool for token should be exist", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .swapETHForExactTokens(
              ADDRESSES.PancakeRouter,
              swapExactETH,
              swapExactBUSD,
              [WBNB.address, other.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.reverted;
      });

      it("Cannot swap more than token balance", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .swapETHForExactTokens(
              ADDRESSES.PancakeRouter,
              ethers.utils.parseEther("0.001").toString(),
              ethers.utils.parseEther("10000").toString(),
              [WBNB.address, BUSD.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.reverted;
      });

      it("Cannot swap more than ETH limit", async () => {
        startTime = await time.latest();
        await expect(
          logic
            .connect(owner)
            .swapETHForExactTokens(
              ADDRESSES.PancakeRouter,
              ethers.utils.parseEther("0.0000001").toString(),
              ethers.utils.parseEther("0.1").toString(),
              [WBNB.address, BUSD.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.reverted;
      });

      it("swap BNB for BUSD", async () => {
        startTime = await time.latest();

        let balanceBNB = await provider.getBalance(logic.address);
        let balanceBUSD = await BUSD.balanceOf(logic.address);

        const tx = await logic
          .connect(owner)
          .swapETHForExactTokens(
            ADDRESSES.PancakeRouter,
            ethers.utils.parseEther("0.001").toString(),
            ethers.utils.parseEther("0.1").toString(),
            [WBNB.address, BUSD.address],
            startTime.add(time.duration.minutes(10)).toString()
          );
        await tx.wait(1);

        let balanceBNBNew = await provider.getBalance(logic.address);
        let balanceBUSDNew = await BUSD.balanceOf(logic.address);

        expect(
          balanceBUSD.add(ethers.utils.parseEther("0.1")).toString()
        ).to.be.eql(
          balanceBUSDNew.toString(),
          "BUSD balance of logic should be increased by " +
            ethers.utils.parseEther("1").toString()
        );
        expect(balanceBNBNew.lt(balanceBNB)).to.be.eql(
          true,
          "BNB balance of logic should be decreased"
        );
      });
    });

    describe("swapTokensForExactTokens", async () => {
      it("Only admin or owner can process swap", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(other)
            .swapTokensForExactTokens(
              ADDRESSES.PancakeRouter,
              swapExactETH,
              swapExactBUSD,
              [USDT.address, BUSD.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: OA2"');
      });

      it("Only allowed swap address", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .swapTokensForExactTokens(
              other.address,
              swapExactETH,
              swapExactBUSD,
              [USDT.address, BUSD.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: E3"');
      });

      it("Pool for token should be exist", async () => {
        startTime = await time.latest();
        await expect(
          logic
            .connect(owner)
            .swapTokensForExactTokens(
              ADDRESSES.PancakeRouter,
              swapExactETH,
              swapExactBUSD,
              [USDT.address, other.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.reverted;

        await expect(
          logic
            .connect(owner)
            .swapTokensForExactTokens(
              ADDRESSES.PancakeRouter,
              swapExactETH,
              swapExactBUSD,
              [other.address, BUSD.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.reverted;
      });

      it("Cannot swap more than out token balance", async () => {
        startTime = await time.latest();
        await expect(
          logic
            .connect(owner)
            .swapTokensForExactTokens(
              ADDRESSES.PancakeRouter,
              ethers.utils.parseEther("10000").toString(),
              ethers.utils.parseEther("0.1").toString(),
              [USDT.address, BUSD.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.reverted;
      });

      it("Cannot swap more than in token limit", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .swapTokensForExactTokens(
              ADDRESSES.PancakeRouter,
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("0.00000001").toString(),
              [USDT.address, BUSD.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.reverted;
      });

      it("swap USDT for BUSD", async () => {
        startTime = await time.latest();

        let balanceUSDT = await USDT.balanceOf(logic.address);
        let balanceBUSD = await BUSD.balanceOf(logic.address);

        const tx = await logic
          .connect(owner)
          .swapTokensForExactTokens(
            ADDRESSES.PancakeRouter,
            ethers.utils.parseEther("0.1").toString(),
            ethers.utils.parseEther("1000").toString(),
            [USDT.address, BUSD.address],
            startTime.add(time.duration.minutes(10)).toString()
          );
        await tx.wait(1);

        let balanceUSDTNew = await USDT.balanceOf(logic.address);
        let balanceBUSDNew = await BUSD.balanceOf(logic.address);

        expect(
          balanceBUSD.add(ethers.utils.parseEther("0.1")).toString()
        ).to.be.eql(
          balanceBUSDNew.toString(),
          "BUSD balance of logic should be increased by " +
            ethers.utils.parseEther("1").toString()
        );
        expect(balanceUSDTNew.lt(balanceUSDT)).to.be.eql(
          true,
          "USDT balance of logic should be decreased"
        );
      });
    });

    describe("swapTokensForExactETH", async () => {
      it("Only admin or owner can process swap", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(other)
            .swapTokensForExactETH(
              ADDRESSES.PancakeRouter,
              swapExactETH,
              swapExactBUSD,
              [BUSD.address, WBNB.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: OA2"');
      });

      it("Only allowed swap address", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .swapTokensForExactETH(
              other.address,
              swapExactETH,
              swapExactBUSD,
              [BUSD.address, WBNB.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: E3"');
      });

      it("ETH path should be matched", async () => {
        startTime = await time.latest();
        await expect(
          logic
            .connect(owner)
            .swapTokensForExactETH(
              ADDRESSES.PancakeRouter,
              swapExactETH,
              swapExactBUSD,
              [BUSD.address, other.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith(
          '"reason":"execution reverted: PancakeRouter: INVALID_PATH"'
        );
      });

      it("Pool for token should be exist", async () => {
        startTime = await time.latest();
        await expect(
          logic
            .connect(owner)
            .swapTokensForExactETH(
              ADDRESSES.PancakeRouter,
              swapExactETH,
              swapExactBUSD,
              [other.address, WBNB.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.reverted;
      });

      it("Cannot swap more than token balance", async () => {
        startTime = await time.latest();
        await expect(
          logic
            .connect(owner)
            .swapTokensForExactETH(
              ADDRESSES.PancakeRouter,
              ethers.utils.parseEther("10000").toString(),
              ethers.utils.parseEther("0.1").toString(),
              [BUSD.address, WBNB.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.revertedWith;
      });

      it("Cannot swap more than in ETH limit", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .swapTokensForExactETH(
              ADDRESSES.PancakeRouter,
              ethers.utils.parseEther("0.1").toString(),
              0,
              [BUSD.address, WBNB.address],
              startTime.add(time.duration.minutes(10)).toString()
            )
        ).to.be.reverted;
      });

      it("swap BUSD for BNB", async () => {
        startTime = await time.latest();

        let balanceBNB = await provider.getBalance(logic.address);
        let balanceBUSD = await BUSD.balanceOf(logic.address);

        const tx = await logic
          .connect(owner)
          .swapTokensForExactETH(
            ADDRESSES.PancakeRouter,
            ethers.utils.parseEther("0.0001").toString(),
            ethers.utils.parseEther("1000").toString(),
            [BUSD.address, WBNB.address],
            startTime.add(time.duration.minutes(10)).toString()
          );
        await tx.wait(1);

        let balanceBNBNew = await provider.getBalance(logic.address);
        let balanceBUSDNew = await BUSD.balanceOf(logic.address);

        expect(
          balanceBNB.add(ethers.utils.parseEther("0.0001")).toString()
        ).to.be.eql(
          balanceBNBNew.toString(),
          "BNB balance of logic should be increased by " +
            ethers.utils.parseEther("1").toString()
        );
        expect(balanceBUSDNew.lt(balanceBUSD)).to.be.eql(
          true,
          "BUSD balance of logic should be decreased"
        );
      });
    });
  });
};
