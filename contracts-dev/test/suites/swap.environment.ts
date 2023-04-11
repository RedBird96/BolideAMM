/*******************************************
 * Test on BSC Mainnet
 * Owner should have at least 1 BNB
 *******************************************/

import dotenv from "dotenv";
import {erc20Abi} from "../../data/contracts_abi/erc20.json";
import {swapRouterAbi} from "../../data/contracts_abi/swapRouter.json";
import {
  pancakeSwapMasterChefV1Abi,
  pancakeSwapMasterChefV2Abi,
} from "../../data/contracts_abi/swapMasterChef.json";
import {lpAbi} from "../../data/contracts_abi/lp.json";
import {ethers} from "hardhat";
import {expect} from "chai";
import {time} from "@openzeppelin/test-helpers";
import {logValue} from "../../utils/helpers";
import {ADDRESS_COLLECTION, PLATFORM} from "../../data/addresses.json";
import {BigNumber} from "ethers";

dotenv.config();

const provider = new ethers.providers.JsonRpcProvider(
  process.env.TESTNET_BSC_PROVIDER_URL,
  {name: "binance", chainId: 97}
);

// Load Addresses
const ADDRESSES = ADDRESS_COLLECTION.bscTestnet;
const platform = PLATFORM.bscTestnet;

// Your Ethereum wallet private key
const owner = process.env.PRIVATE_KEY
  ? new ethers.Wallet(process.env.PRIVATE_KEY!, provider)
  : ethers.Wallet.createRandom();
const other = process.env.PRIVATE_KEY_TEST
  ? new ethers.Wallet(process.env.PRIVATE_KEY_TEST!, provider)
  : ethers.Wallet.createRandom();

// Initialize vTokens Contract
const BLID = new ethers.Contract(platform.blid, erc20Abi, owner);
const CAKE = new ethers.Contract(
  ADDRESSES.Token.CAKE.Underlying,
  erc20Abi,
  owner
);
const XVS = new ethers.Contract(
  ADDRESSES.Token.XVS.Underlying,
  erc20Abi,
  owner
);
const USDT = new ethers.Contract(
  ADDRESSES.Token.USDT.Underlying,
  erc20Abi,
  owner
);
const USDC = new ethers.Contract(
  ADDRESSES.Token.USDC.Underlying,
  erc20Abi,
  owner
);
const SXP = new ethers.Contract(
  ADDRESSES.Token.SXP.Underlying,
  erc20Abi,
  owner
);
const BUSD = new ethers.Contract(
  ADDRESSES.Token.BUSD.Underlying,
  erc20Abi,
  owner
);
const BNB = new ethers.Contract(
  ADDRESSES.Token.BNB.Underlying,
  erc20Abi,
  owner
);

// Variables for deployed contract
let tx, startTime: typeof time;

export const swap_environment = () => {
  let swapRouter: any,
    swapMasterV1: any,
    swapMasterV2: any,
    arrLpToken: Array<string>;

  before(async () => {
    swapRouter = new ethers.Contract(
      ADDRESSES.PancakeRouter,
      swapRouterAbi,
      owner
    );
  });

  xdescribe("Swap BNB for Tokens", async () => {
    xit("Swap BNB for BLID", async () => {
      startTime = await time.latest();
      const tx = await swapRouter
        .connect(owner)
        .swapExactETHForTokens(
          ethers.utils.parseEther("0").toString(),
          [ADDRESSES.Token.BNB.Underlying, BLID.address],
          owner.address,
          startTime.add(time.duration.minutes(20)).toString(),
          {
            from: owner.address,
            value: ethers.utils.parseEther("0.001").toString(),
          }
        );
      await tx.wait(1);
    });

    xit("Swap BNB for XVS", async () => {
      startTime = await time.latest();
      const tx = await swapRouter
        .connect(owner)
        .swapExactETHForTokens(
          ethers.utils.parseEther("0").toString(),
          [ADDRESSES.Token.BNB.Underlying, ADDRESSES.Token.XVS.Underlying],
          owner.address,
          startTime.add(time.duration.minutes(20)).toString(),
          {
            from: owner.address,
            value: ethers.utils.parseEther("0.01").toString(),
          }
        );
      await tx.wait(1);
    });

    xit("Swap BNB for USDT", async () => {
      startTime = await time.latest();
      const tx = await swapRouter
        .connect(owner)
        .swapExactETHForTokens(
          ethers.utils.parseEther("0").toString(),
          [ADDRESSES.Token.BNB.Underlying, ADDRESSES.Token.USDT.Underlying],
          owner.address,
          startTime.add(time.duration.minutes(20)).toString(),
          {
            from: owner.address,
            value: ethers.utils.parseEther("0.01").toString(),
          }
        );
      await tx.wait(1);
    });

    xit("Swap BNB for USDC", async () => {
      startTime = await time.latest();
      const tx = await swapRouter
        .connect(owner)
        .swapExactETHForTokens(
          ethers.utils.parseEther("0").toString(),
          [ADDRESSES.Token.BNB.Underlying, ADDRESSES.Token.USDC.Underlying],
          owner.address,
          startTime.add(time.duration.minutes(20)).toString(),
          {
            from: owner.address,
            value: ethers.utils.parseEther("0.01").toString(),
          }
        );
      await tx.wait(1);
    });

    xit("Swap BNB for BUSD", async () => {
      startTime = await time.latest();
      const tx = await swapRouter
        .connect(owner)
        .swapExactETHForTokens(
          ethers.utils.parseEther("0").toString(),
          [ADDRESSES.Token.BNB.Underlying, ADDRESSES.Token.BUSD.Underlying],
          owner.address,
          startTime.add(time.duration.minutes(20)).toString(),
          {
            from: owner.address,
            value: ethers.utils.parseEther("0.01").toString(),
          }
        );
      await tx.wait(1);
    });

    xit("Swap BNB for SXP", async () => {
      startTime = await time.latest();
      const tx = await swapRouter
        .connect(owner)
        .swapExactETHForTokens(
          ethers.utils.parseEther("0").toString(),
          [ADDRESSES.Token.BNB.Underlying, ADDRESSES.Token.SXP.Underlying],
          owner.address,
          startTime.add(time.duration.minutes(20)).toString(),
          {
            from: owner.address,
            value: ethers.utils.parseEther("0.01").toString(),
          }
        );
      await tx.wait(1);
    });
  });

  xdescribe("Test", async () => {
    it("Check Path XVS-BNB", async () => {
      tx = await swapRouter
        .connect(owner)
        .getAmountsOut(ethers.utils.parseEther("1").toString(), [
          ADDRESSES.Token.XVS.Underlying,
          ADDRESSES.Token.BNB.Underlying,
        ]);
      console.log(tx);
    });

    it("Check Path CAKE-BNB", async () => {
      tx = await swapRouter
        .connect(owner)
        .getAmountsOut(ethers.utils.parseEther("1").toString(), [
          ADDRESSES.Token.CAKE.Underlying,
          ADDRESSES.Token.BNB.Underlying,
        ]);
      console.log(tx);
    });

    xit("Try to Swap CAKE-BNB", async () => {
      tx = await CAKE.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("1").toString()
      );
      await tx.wait(1);

      startTime = await time.latest();
      tx = await swapRouter
        .connect(owner)
        .swapExactTokensForETH(
          ethers.utils.parseEther("1").toString(),
          "0",
          [ADDRESSES.Token.CAKE.Underlying, ADDRESSES.Token.BNB.Underlying],
          owner.address,
          startTime.add(time.duration.minutes(20)).toString()
        );
      await tx.wait(1);
    });

    it("Try to Swap XVS-BNB", async () => {
      tx = await XVS.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("1").toString()
      );
      await tx.wait(1);

      startTime = await time.latest();
      tx = await swapRouter
        .connect(owner)
        .swapExactTokensForETH(
          ethers.utils.parseEther("1").toString(),
          "0",
          [ADDRESSES.Token.XVS.Underlying, ADDRESSES.Token.BNB.Underlying],
          owner.address,
          startTime.add(time.duration.minutes(20)).toString()
        );
      await tx.wait(1);
    });
  });

  xdescribe("AddLiquidity and get LP Token", async () => {
    xit("BLID - BNB", async () => {
      tx = await BLID.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("1000").toString()
      );
      await tx.wait(1);

      startTime = await time.latest();
      tx = await swapRouter
        .connect(owner)
        .addLiquidityETH(
          BLID.address,
          ethers.utils.parseEther("1000").toString(),
          "0",
          "0",
          owner.address,
          startTime.add(time.duration.minutes(20)).toString(),
          {
            from: owner.address,
            value: ethers.utils.parseEther("1").toString(),
          }
        );
      await tx.wait(1);
    });

    xit("BNB - CAKE", async () => {
      tx = await CAKE.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      startTime = await time.latest();
      tx = await swapRouter
        .connect(owner)
        .addLiquidityETH(
          ADDRESSES.Token.CAKE.Underlying,
          ethers.utils.parseEther("10").toString(),
          "0",
          "0",
          owner.address,
          startTime.add(time.duration.minutes(20)).toString(),
          {
            from: owner.address,
            value: ethers.utils.parseEther("0.001").toString(),
          }
        );
      await tx.wait(1);
    });

    xit("USDT - CAKE", async () => {
      tx = await USDT.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("0.000000001").toString()
      );
      await tx.wait(1);

      tx = await CAKE.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      startTime = await time.latest();
      tx = await swapRouter
        .connect(owner)
        .addLiquidity(
          ADDRESSES.Token.USDT.Underlying,
          ADDRESSES.Token.CAKE.Underlying,
          ethers.utils.parseEther("0.000000001").toString(),
          ethers.utils.parseEther("10").toString(),
          "0",
          "0",
          owner.address,
          startTime.add(time.duration.minutes(20)).toString()
        );
      await tx.wait(1);
    });

    xit("USDC - CAKE", async () => {
      tx = await USDC.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      tx = await CAKE.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      startTime = await time.latest();
      tx = await swapRouter
        .connect(owner)
        .addLiquidity(
          ADDRESSES.Token.USDC.Underlying,
          ADDRESSES.Token.CAKE.Underlying,
          ethers.utils.parseEther("10").toString(),
          ethers.utils.parseEther("10").toString(),
          "0",
          "0",
          owner.address,
          startTime.add(time.duration.minutes(20)).toString()
        );
      await tx.wait(1);
    });

    xit("BUSD - CAKE", async () => {
      tx = await BUSD.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      tx = await CAKE.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      startTime = await time.latest();
      tx = await swapRouter
        .connect(owner)
        .addLiquidity(
          ADDRESSES.Token.BUSD.Underlying,
          ADDRESSES.Token.CAKE.Underlying,
          ethers.utils.parseEther("10").toString(),
          ethers.utils.parseEther("10").toString(),
          "0",
          "0",
          owner.address,
          startTime.add(time.duration.minutes(20)).toString()
        );
      await tx.wait(1);
    });

    xit("SXP - CAKE", async () => {
      tx = await SXP.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      tx = await CAKE.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      startTime = await time.latest();
      tx = await swapRouter
        .connect(owner)
        .addLiquidity(
          ADDRESSES.Token.SXP.Underlying,
          ADDRESSES.Token.CAKE.Underlying,
          ethers.utils.parseEther("10").toString(),
          ethers.utils.parseEther("10").toString(),
          "0",
          "0",
          owner.address,
          startTime.add(time.duration.minutes(20)).toString()
        );
      await tx.wait(1);
    });

    xit("USDT - BNB", async () => {
      tx = await USDT.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      startTime = await time.latest();
      tx = await swapRouter
        .connect(owner)
        .addLiquidityETH(
          ADDRESSES.Token.USDT.Underlying,
          ethers.utils.parseEther("10").toString(),
          "0",
          "0",
          owner.address,
          startTime.add(time.duration.minutes(20)).toString(),
          {
            from: owner.address,
            value: ethers.utils.parseEther("0.001").toString(),
          }
        );
      await tx.wait(1);
    });

    xit("USDC - BNB", async () => {
      tx = await USDC.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      startTime = await time.latest();
      tx = await swapRouter
        .connect(owner)
        .addLiquidityETH(
          ADDRESSES.Token.USDC.Underlying,
          ethers.utils.parseEther("10").toString(),
          "0",
          "0",
          owner.address,
          startTime.add(time.duration.minutes(20)).toString(),
          {
            from: owner.address,
            value: ethers.utils.parseEther("0.001").toString(),
          }
        );
      await tx.wait(1);
    });

    xit("BUSD - BNB", async () => {
      tx = await BUSD.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      startTime = await time.latest();
      tx = await swapRouter
        .connect(owner)
        .addLiquidityETH(
          ADDRESSES.Token.BUSD.Underlying,
          ethers.utils.parseEther("10").toString(),
          "0",
          "0",
          owner.address,
          startTime.add(time.duration.minutes(20)).toString(),
          {
            from: owner.address,
            value: ethers.utils.parseEther("0.001").toString(),
          }
        );
      await tx.wait(1);
    });

    xit("SXP - BNB", async () => {
      tx = await SXP.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      startTime = await time.latest();
      tx = await swapRouter
        .connect(owner)
        .addLiquidityETH(
          ADDRESSES.Token.SXP.Underlying,
          ethers.utils.parseEther("10").toString(),
          "0",
          "0",
          owner.address,
          startTime.add(time.duration.minutes(20)).toString(),
          {
            from: owner.address,
            value: ethers.utils.parseEther("0.001").toString(),
          }
        );
      await tx.wait(1);
    });

    xit("BUSD - USDT", async () => {
      tx = await BUSD.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      tx = await USDT.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      startTime = await time.latest();
      tx = await swapRouter
        .connect(owner)
        .addLiquidity(
          ADDRESSES.Token.BUSD.Underlying,
          ADDRESSES.Token.USDT.Underlying,
          ethers.utils.parseEther("10").toString(),
          ethers.utils.parseEther("10").toString(),
          "0",
          "0",
          owner.address,
          startTime.add(time.duration.minutes(20)).toString()
        );
      await tx.wait(1);
    });

    xit("BUSD - USDC", async () => {
      tx = await BUSD.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      tx = await USDC.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      startTime = await time.latest();
      tx = await swapRouter
        .connect(owner)
        .addLiquidity(
          ADDRESSES.Token.BUSD.Underlying,
          ADDRESSES.Token.USDC.Underlying,
          ethers.utils.parseEther("10").toString(),
          ethers.utils.parseEther("10").toString(),
          "0",
          "0",
          owner.address,
          startTime.add(time.duration.minutes(20)).toString()
        );
      await tx.wait(1);
    });

    xit("BUSD - SXP", async () => {
      tx = await BUSD.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      tx = await SXP.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      startTime = await time.latest();
      tx = await swapRouter
        .connect(owner)
        .addLiquidity(
          ADDRESSES.Token.BUSD.Underlying,
          ADDRESSES.Token.SXP.Underlying,
          ethers.utils.parseEther("10").toString(),
          ethers.utils.parseEther("10").toString(),
          "0",
          "0",
          owner.address,
          startTime.add(time.duration.minutes(20)).toString()
        );
      await tx.wait(1);
    });

    xit("USDT - USDC", async () => {
      tx = await USDT.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      tx = await USDC.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      startTime = await time.latest();
      tx = await swapRouter
        .connect(owner)
        .addLiquidity(
          ADDRESSES.Token.USDT.Underlying,
          ADDRESSES.Token.USDC.Underlying,
          ethers.utils.parseEther("10").toString(),
          ethers.utils.parseEther("10").toString(),
          "0",
          "0",
          owner.address,
          startTime.add(time.duration.minutes(20)).toString()
        );
      await tx.wait(1);
    });

    xit("USDT - SXP", async () => {
      tx = await USDT.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      tx = await SXP.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      startTime = await time.latest();
      tx = await swapRouter
        .connect(owner)
        .addLiquidity(
          ADDRESSES.Token.USDT.Underlying,
          ADDRESSES.Token.SXP.Underlying,
          ethers.utils.parseEther("10").toString(),
          ethers.utils.parseEther("10").toString(),
          "0",
          "0",
          owner.address,
          startTime.add(time.duration.minutes(20)).toString()
        );
      await tx.wait(1);
    });

    xit("USDC - SXP", async () => {
      tx = await USDC.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      tx = await SXP.connect(owner).approve(
        swapRouter.address,
        ethers.utils.parseEther("10").toString()
      );
      await tx.wait(1);

      startTime = await time.latest();
      tx = await swapRouter
        .connect(owner)
        .addLiquidity(
          ADDRESSES.Token.USDC.Underlying,
          ADDRESSES.Token.SXP.Underlying,
          ethers.utils.parseEther("10").toString(),
          ethers.utils.parseEther("10").toString(),
          "0",
          "0",
          owner.address,
          startTime.add(time.duration.minutes(20)).toString()
        );
      await tx.wait(1);
    });
  });

  xdescribe("Get Pool IDs of MasterChef", async () => {
    before(async () => {
      swapMasterV1 = new ethers.Contract(
        ADDRESSES.PancakeMasterV1,
        pancakeSwapMasterChefV1Abi,
        owner
      );

      swapMasterV2 = new ethers.Contract(
        ADDRESSES.PancakeMasterV2,
        pancakeSwapMasterChefV2Abi,
        owner
      );
    });

    it("PancakeswapMasterchefV1", async () => {
      const poolLength = await swapMasterV1.connect(owner).poolLength();
      arrLpToken = new Array<string>();

      console.log("MasterChef V1 - " + swapMasterV1.address);
      for (let i = 0; i < poolLength; i++) {
        const poolInfo = await swapMasterV1
          .connect(owner)
          .poolInfo(i.toString());

        const lpToken = new ethers.Contract(poolInfo.lpToken, lpAbi, owner);
        arrLpToken.push(poolInfo.lpToken.toString());

        let token0, token1;

        try {
          token0 = await lpToken.connect(owner).token0();
          token1 = await lpToken.connect(owner).token1();

          console.log(
            i + " : " + poolInfo.lpToken + " - " + token0 + " " + token1
          );
        } catch (e: any) {
          console.log(i + " : " + poolInfo.lpToken);
        }
      }
    });

    xit("PancakeswapMasterchefV2", async () => {
      const poolLength = await swapMasterV2.connect(owner).poolLength();
      arrLpToken = new Array<string>();

      console.log("MasterChef V2 - " + swapMasterV2.address);
      for (let i = 0; i < poolLength; i++) {
        const lpTokenAddress = await swapMasterV2
          .connect(owner)
          .lpToken(i.toString());

        const lpToken = new ethers.Contract(lpTokenAddress, lpAbi, owner);
        arrLpToken.push(lpTokenAddress);

        let token0, token1;

        try {
          token0 = await lpToken.connect(owner).token0();
          token1 = await lpToken.connect(owner).token1();

          console.log(
            i + " : " + lpTokenAddress + " - " + token0 + " " + token1
          );
        } catch (e: any) {
          console.log(i + " : " + lpTokenAddress);
        }
      }
    });
  });

  xdescribe("Add Pool to MasterChef", async () => {
    before(async () => {
      swapMasterV1 = new ethers.Contract(
        ADDRESSES.PancakeMasterV1,
        pancakeSwapMasterChefV1Abi,
        owner
      );

      swapMasterV2 = new ethers.Contract(
        ADDRESSES.PancakeMasterV2,
        pancakeSwapMasterChefV2Abi,
        owner
      );
    });

    it("Show the list of LP Tokens in Masterchef", async () => {
      for (let i: number = 0; i < arrLpToken.length; i++)
        logValue(i.toString(), arrLpToken[i]);
    });

    it("Add Pools", async () => {
      const arrLPName = Object.keys(ADDRESSES.SWAP.Pancake);

      for (let i: number = 0; i < arrLPName.length; i++) {
        // @ts-ignore
        const LPAddress = ADDRESSES.SWAP.Pancake[arrLPName[i]].LP;

        let exist: boolean = false;
        if (
          arrLpToken.find(
            (item) => item.toLowerCase() == LPAddress.toLowerCase()
          ) == undefined
        ) {
          tx = await swapMasterV1.connect(owner).add(500, LPAddress, false);
          await tx.wait(1);

          logValue(arrLPName[i], LPAddress);
        }
      }
    });

    xit("Set allocPoint", async () => {
      const arrLPName = Object.keys(ADDRESSES.SWAP.Pancake);

      for (let i: number = 0; i < arrLPName.length; i++) {
        // @ts-ignore
        const PoolID = ADDRESSES.SWAP.Pancake[arrLPName[i]].PoolIDV1;

        if (PoolID != "") {
          tx = await swapMasterV1.connect(owner).set(PoolID, 500, false);
          await tx.wait(1);
        }
      }
    });
  });

  xdescribe("Deposit BUSD_CAKE to V1", async () => {
    before(async () => {
      swapMasterV1 = new ethers.Contract(
        ADDRESSES.PancakeMasterV1,
        pancakeSwapMasterChefV1Abi,
        owner
      );

      swapMasterV2 = new ethers.Contract(
        ADDRESSES.PancakeMasterV2,
        pancakeSwapMasterChefV2Abi,
        owner
      );
    });

    it("Approve", async () => {
      const LP_BUSD_CAKE = new ethers.Contract(
        ADDRESSES.SWAP.Pancake.BUSD_CAKE.LP,
        erc20Abi,
        owner
      );

      tx = await LP_BUSD_CAKE.connect(owner).approve(
        swapMasterV1.address,
        999999000
      );
      await tx.wait(1);
    });

    it("Deposit to Pool 4", async () => {
      tx = await swapMasterV1.connect(owner).deposit(5, 999999000);
      await tx.wait(1);
    });
  });
};
