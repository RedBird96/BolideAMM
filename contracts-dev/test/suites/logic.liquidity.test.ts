/*******************************************
 * Test on BSC Testnet
 * Before run test, deploy logic contract on testnet
 * Logic contract should have at least 0.1 BNB
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
  Bolide__factory,
  Logic__factory,
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
const logicAddress = "0x29cEE0EA0201E482407C7A0Dd53a7439a930263F"; // Testnet
const bolideAddress = "0x0cC2c6782B19Dc3e796d5d8764944638FbE3F3a6"; // Testnet

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
const PancakeLP_BUSD_USDT = new ethers.Contract(
  ADDRESSES.SWAP.Pancake.BUSD_USDT.LP,
  erc20Abi,
  owner
);
const PancakeLP_ETH_BUSD = new ethers.Contract(
  ADDRESSES.SWAP.Pancake.BUSD_BNB.LP,
  erc20Abi,
  owner
);

// Variables for deployed contract
let logic: Logic, bolide: Bolide;

let startTime: typeof time;

export const logic_liquidity = () => {
  before(async () => {
    logic = Logic__factory.connect(logicAddress, owner) as Logic;

    bolide = Bolide__factory.connect(bolideAddress, owner) as Bolide;
  });

  describe("Preparation", async () => {
    it("Approve swap for WBNB", async () => {
      await logic.connect(owner).approveTokenForSwap(WBNB.address);
    });

    it("Approve swap for USDT", async () => {
      await logic.connect(owner).approveTokenForSwap(USDT.address);
    });

    it("Approve swap for BUSD", async () => {
      await logic.connect(owner).approveTokenForSwap(BUSD.address);
    });

    it("Approve swap for LP(BUSD-USDT)", async () => {
      await logic
        .connect(owner)
        .approveTokenForSwap(ADDRESSES.SWAP.Pancake.BUSD_USDT.LP);
    });

    it("Approve swap for LP(ETH-BUSD)", async () => {
      await logic
        .connect(owner)
        .approveTokenForSwap(ADDRESSES.SWAP.Pancake.BUSD_BNB.LP);
    });
  });

  describe("Pancakeswap", async () => {
    describe("Preparation", async () => {
      it("swap WBNB for BUSD", async () => {
        startTime = await time.latest();
        const tx = await logic
          .connect(owner)
          .swapExactETHForTokens(
            ADDRESSES.PancakeRouter,
            ethers.utils.parseEther("0.01").toString(),
            0,
            [WBNB.address, BUSD.address],
            startTime.add(time.duration.minutes(20)).toString()
          );
      });

      it("swap BUSD for USDT", async () => {
        startTime = await time.latest();
        const tx = await logic
          .connect(owner)
          .swapExactTokensForTokens(
            ADDRESSES.PancakeRouter,
            ethers.utils.parseEther("0.1").toString(),
            0,
            [BUSD.address, USDT.address],
            startTime.add(time.duration.minutes(20)).toString()
          );
      });
    });

    describe("addLiquidity", async () => {
      it("Only admin or owner can process", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(other)
            .addLiquidity(
              ADDRESSES.PancakeRouter,
              BUSD.address,
              USDT.address,
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("1").toString(),
              ethers.utils.parseEther("1").toString(),
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: OA2"');
      });

      it("Only allowed swap address", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .addLiquidity(
              other.address,
              BUSD.address,
              USDT.address,
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("1").toString(),
              ethers.utils.parseEther("1").toString(),
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: E3"');
      });

      it("Only ERC20 token should be used", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .addLiquidity(
              ADDRESSES.PancakeRouter,
              other.address,
              USDT.address,
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("0.1").toString(),
              0,
              0,
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.reverted;
      });

      it("Liquid Pool for tokens should be exist", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .addLiquidity(
              ADDRESSES.PancakeRouter,
              bolide.address,
              USDT.address,
              ethers.utils.parseEther("0.01").toString(),
              ethers.utils.parseEther("0.01").toString(),
              0,
              0,
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith(
          '"reason":"execution reverted: TransferHelper::transferFrom: transferFrom failed"'
        );
      });

      it("Desired amount of token A and B cannot be more than balance", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .addLiquidity(
              ADDRESSES.PancakeRouter,
              BUSD.address,
              USDT.address,
              ethers.utils.parseEther("1000").toString(),
              ethers.utils.parseEther("1000").toString(),
              0,
              0,
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith(
          '"reason":"execution reverted: TransferHelper::transferFrom: transferFrom failed"'
        );
      });

      it("Liquid amount of token A, B cannot be more than minimum", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .addLiquidity(
              ADDRESSES.PancakeRouter,
              BUSD.address,
              USDT.address,
              ethers.utils.parseEther("0.001").toString(),
              ethers.utils.parseEther("0.001").toString(),
              ethers.utils.parseEther("100000").toString(),
              ethers.utils.parseEther("100000").toString(),
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith(
          '"reason":"execution reverted: PancakeRouter: INSUFFICIENT_'
        );
      });

      it("Add Liquidity with BUSD, USDT", async () => {
        let balanceBUSD = await BUSD.balanceOf(logic.address);
        let balanceUSDT = await USDT.balanceOf(logic.address);
        let balanceLP = await PancakeLP_BUSD_USDT.balanceOf(logic.address);

        startTime = await time.latest();
        const tx = await logic
          .connect(owner)
          .addLiquidity(
            ADDRESSES.PancakeRouter,
            BUSD.address,
            USDT.address,
            ethers.utils.parseEther("0.01").toString(),
            ethers.utils.parseEther("0.01").toString(),
            0,
            0,
            startTime.add(time.duration.minutes(20)).toString()
          );
        await tx.wait(1);

        let balanceBUSDNew = await BUSD.balanceOf(logic.address);
        let balanceUSDTNew = await USDT.balanceOf(logic.address);
        let balanceLPNew = await PancakeLP_BUSD_USDT.balanceOf(logic.address);

        expect(balanceBUSDNew.lt(balanceBUSD)).to.be.eql(
          true,
          "BUSD balance of logic should be decreased"
        );
        expect(balanceUSDTNew.lt(balanceUSDT)).to.be.eql(
          true,
          "USDT balance of logic should be decreased"
        );
        expect(balanceLPNew.gt(balanceLP)).to.be.eql(
          true,
          "LP(Cake) Token balance of logic should be increased"
        );
      });
    });

    describe("removeLiquidity", async () => {
      it("Only admin or owner can process", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(other)
            .removeLiquidity(
              ADDRESSES.PancakeRouter,
              BUSD.address,
              USDT.address,
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("1").toString(),
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: OA2"');
      });

      it("Only allowed swap address", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .removeLiquidity(
              other.address,
              BUSD.address,
              USDT.address,
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("1").toString(),
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: E3"');
      });

      it("Only ERC20 token should be used", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .removeLiquidity(
              ADDRESSES.PancakeRouter,
              other.address,
              USDT.address,
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("0.1").toString(),
              0,
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.reverted;
      });

      it("Liquid Pool for tokens should be exist", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .removeLiquidity(
              ADDRESSES.PancakeRouter,
              bolide.address,
              USDT.address,
              ethers.utils.parseEther("0.001").toString(),
              0,
              0,
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.reverted;
      });

      it("Cannot claim over LP token balance", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .removeLiquidity(
              ADDRESSES.PancakeRouter,
              BUSD.address,
              USDT.address,
              ethers.utils.parseEther("1000").toString(),
              0,
              0,
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.reverted;
      });

      it("Desired amount of token A cannot be more than minimum", async () => {
        startTime = await time.latest();
        let balanceLP = await PancakeLP_BUSD_USDT.balanceOf(logic.address);
        const tx = await expect(
          logic
            .connect(owner)
            .removeLiquidity(
              ADDRESSES.PancakeRouter,
              BUSD.address,
              USDT.address,
              balanceLP.toString(),
              ethers.utils.parseEther("1000").toString(),
              0,
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith(
          '"reason":"execution reverted: PancakeRouter: INSUFFICIENT_A_AMOUNT"'
        );
      });

      it("Desired amount of token B cannot be more than minimum", async () => {
        startTime = await time.latest();
        let balanceLP = await PancakeLP_BUSD_USDT.balanceOf(logic.address);
        const tx = await expect(
          logic
            .connect(owner)
            .removeLiquidity(
              ADDRESSES.PancakeRouter,
              BUSD.address,
              USDT.address,
              balanceLP.toString(),
              0,
              ethers.utils.parseEther("1000").toString(),
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith(
          '"reason":"execution reverted: PancakeRouter: INSUFFICIENT_B_AMOUNT"'
        );
      });

      it("Remove Liquidity with BUSD, USDT", async () => {
        let balanceBUSD = await BUSD.balanceOf(logic.address);
        let balanceUSDT = await USDT.balanceOf(logic.address);
        let balanceLP = await PancakeLP_BUSD_USDT.balanceOf(logic.address);

        startTime = await time.latest();
        const tx = await logic
          .connect(owner)
          .removeLiquidity(
            ADDRESSES.PancakeRouter,
            BUSD.address,
            USDT.address,
            balanceLP.toString(),
            0,
            0,
            startTime.add(time.duration.minutes(20)).toString()
          );
        await tx.wait(1);

        let balanceBUSDNew = await BUSD.balanceOf(logic.address);
        let balanceUSDTNew = await USDT.balanceOf(logic.address);
        let balanceLPNew = await PancakeLP_BUSD_USDT.balanceOf(logic.address);

        expect(balanceBUSDNew.gt(balanceBUSD)).to.be.eql(
          true,
          "BUSD balance of logic should be increased"
        );
        expect(balanceUSDTNew.gt(balanceUSDT)).to.be.eql(
          true,
          "USDT balance of logic should be increased"
        );
        expect(balanceLPNew.lt(balanceLP)).to.be.eql(
          true,
          "LP(Cake) Token balance of logic should be decreased"
        );
      });
    });

    describe("addLiquidityETH", async () => {
      it("Only admin or owner can process", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(other)
            .addLiquidityETH(
              ADDRESSES.PancakeRouter,
              BUSD.address,
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("1").toString(),
              ethers.utils.parseEther("1").toString(),
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: OA2"');
      });

      it("Only allowed swap address", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .addLiquidityETH(
              other.address,
              BUSD.address,
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("1").toString(),
              ethers.utils.parseEther("1").toString(),
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: E3"');
      });

      it("Only ERC20 token should be used", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .addLiquidityETH(
              ADDRESSES.PancakeRouter,
              other.address,
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("0.1").toString(),
              0,
              0,
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.reverted;
      });

      it("Liquid Pool for tokens should be exist", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .addLiquidityETH(
              ADDRESSES.PancakeRouter,
              bolide.address,
              ethers.utils.parseEther("0.01").toString(),
              ethers.utils.parseEther("0.01").toString(),
              0,
              0,
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith(
          '"reason":"execution reverted: TransferHelper::transferFrom: transferFrom failed"'
        );
      });

      it("Desired amount of token cannot be more than balance", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .addLiquidityETH(
              ADDRESSES.PancakeRouter,
              BUSD.address,
              ethers.utils.parseEther("1000").toString(),
              ethers.utils.parseEther("0.1").toString(),
              0,
              0,
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted"');
      });

      it("Desired amount of ETH cannot be more than balance", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .addLiquidityETH(
              ADDRESSES.PancakeRouter,
              BUSD.address,
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("10000").toString(),
              0,
              0,
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted"');
      });

      it("Liquid amount of token, ETH cannot be more than minimum", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .addLiquidityETH(
              ADDRESSES.PancakeRouter,
              BUSD.address,
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("100000").toString(),
              ethers.utils.parseEther("100000").toString(),
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted"');
      });

      it("Add Liquidity with BUSD, ETH", async () => {
        let balanceBUSD = await BUSD.balanceOf(logic.address);
        let balanceBNB = await provider.getBalance(logic.address);
        let balanceLP = await PancakeLP_ETH_BUSD.balanceOf(logic.address);

        startTime = await time.latest();
        const tx = await logic
          .connect(owner)
          .addLiquidityETH(
            ADDRESSES.PancakeRouter,
            BUSD.address,
            ethers.utils.parseEther("0.001").toString(),
            ethers.utils.parseEther("0.01").toString(),
            0,
            0,
            startTime.add(time.duration.minutes(20)).toString()
          );
        await tx.wait(1);

        let balanceBUSDNew = await BUSD.balanceOf(logic.address);
        let balanceBNBNew = await provider.getBalance(logic.address);
        let balanceLPNew = await PancakeLP_ETH_BUSD.balanceOf(logic.address);

        expect(balanceBUSDNew.lt(balanceBUSD)).to.be.eql(
          true,
          "BUSD balance of logic should be decreased"
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
    });

    describe("removeLiquidityETH", async () => {
      it("Only admin or owner can process", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(other)
            .removeLiquidityETH(
              ADDRESSES.PancakeRouter,
              BUSD.address,
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("1").toString(),
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: OA2"');
      });

      it("Only allowed swap address", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .removeLiquidityETH(
              other.address,
              BUSD.address,
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("1").toString(),
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted: E3"');
      });

      it("Only ERC20 token should be used", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .removeLiquidityETH(
              ADDRESSES.PancakeRouter,
              other.address,
              ethers.utils.parseEther("0.1").toString(),
              ethers.utils.parseEther("0.1").toString(),
              0,
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted"');
      });

      it("Liquid Pool for tokens should be exist", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .removeLiquidityETH(
              ADDRESSES.PancakeRouter,
              bolide.address,
              ethers.utils.parseEther("0.001").toString(),
              0,
              0,
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith('"reason":"execution reverted"');
      });

      it("Cannot claim over LP token balance", async () => {
        startTime = await time.latest();
        const tx = await expect(
          logic
            .connect(owner)
            .removeLiquidityETH(
              ADDRESSES.PancakeRouter,
              BUSD.address,
              ethers.utils.parseEther("1000").toString(),
              0,
              0,
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith(
          '"reason":"execution reverted: ds-math-sub-underflow"'
        );
      });

      it("Desired amount of token cannot be more than minimum", async () => {
        startTime = await time.latest();
        let balanceLP = await PancakeLP_ETH_BUSD.balanceOf(logic.address);
        const tx = await expect(
          logic
            .connect(owner)
            .removeLiquidityETH(
              ADDRESSES.PancakeRouter,
              BUSD.address,
              balanceLP.toString(),
              ethers.utils.parseEther("1000").toString(),
              0,
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith(
          '"reason":"execution reverted: PancakeRouter: INSUFFICIENT_A_AMOUNT"'
        );
      });

      it("Desired amount of ETH cannot be more than minimum", async () => {
        startTime = await time.latest();
        let balanceLP = await PancakeLP_ETH_BUSD.balanceOf(logic.address);
        const tx = await expect(
          logic
            .connect(owner)
            .removeLiquidityETH(
              ADDRESSES.PancakeRouter,
              BUSD.address,
              balanceLP.toString(),
              0,
              ethers.utils.parseEther("1000").toString(),
              startTime.add(time.duration.minutes(20)).toString()
            )
        ).to.be.revertedWith(
          '"reason":"execution reverted: PancakeRouter: INSUFFICIENT_B_AMOUNT"'
        );
      });

      it("Remove Liquidity with ETH BUSD", async () => {
        let balanceBUSD = await BUSD.balanceOf(logic.address);
        let balanceBNB = await provider.getBalance(logic.address);
        let balanceLP = await PancakeLP_ETH_BUSD.balanceOf(logic.address);

        startTime = await time.latest();
        const tx = await logic
          .connect(owner)
          .removeLiquidityETH(
            ADDRESSES.PancakeRouter,
            BUSD.address,
            balanceLP.toString(),
            0,
            0,
            startTime.add(time.duration.minutes(20)).toString()
          );
        await tx.wait(1);

        let balanceBUSDNew = await BUSD.balanceOf(logic.address);
        let balanceBNBNew = await provider.getBalance(logic.address);
        let balanceLPNew = await PancakeLP_ETH_BUSD.balanceOf(logic.address);

        expect(balanceBUSDNew.gt(balanceBUSD)).to.be.eql(
          true,
          "BUSD balance of logic should be increased"
        );
        expect(balanceBNBNew.gt(balanceBNB)).to.be.eql(
          true,
          "BNB balance of logic should be increased"
        );
        expect(balanceLPNew.lt(balanceLP)).to.be.eql(
          true,
          "LP(Cake) Token balance of logic should be decreased"
        );
      });
    });

    describe("Rollback preparation", async () => {
      it("swap USDT for BUSD", async () => {
        startTime = await time.latest();
        let balanceUSDT = await USDT.balanceOf(logic.address);
        const tx = await logic
          .connect(owner)
          .swapExactTokensForTokens(
            ADDRESSES.PancakeRouter,
            balanceUSDT,
            0,
            [USDT.address, BUSD.address],
            startTime.add(time.duration.minutes(20)).toString()
          );
        await tx.wait(1);
      });

      it("swap BUSD for WBNB", async () => {
        startTime = await time.latest();
        let balanceBUSD = await BUSD.balanceOf(logic.address);
        const tx = await logic
          .connect(owner)
          .swapExactTokensForETH(
            ADDRESSES.PancakeRouter,
            balanceBUSD.toString(),
            0,
            [BUSD.address, WBNB.address],
            startTime.add(time.duration.minutes(20)).toString()
          );
        await tx.wait(1);
      });
    });
  });
};
