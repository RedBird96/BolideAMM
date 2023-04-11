/*******************************************
 * Test on BSC Testnet
 * Before run test, deploy logic contract on testnet
 * Owner should have more than 10000000000 CAKE
 *******************************************/

import dotenv from "dotenv";
import {ethers} from "hardhat";
import {expect} from "chai";
import {time} from "@openzeppelin/test-helpers";
import {erc20Abi} from "../../data/contracts_abi/erc20.json";
import {cakeAbi} from "../../data/contracts_abi/cake.json";
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

// Your Ethereum wallet private key
const owner = process.env.PRIVATE_KEY
  ? new ethers.Wallet(process.env.PRIVATE_KEY!, provider)
  : ethers.Wallet.createRandom();
const other = process.env.PRIVATE_KEY_TEST
  ? new ethers.Wallet(process.env.PRIVATE_KEY_TEST!, provider)
  : ethers.Wallet.createRandom();

// Testnet deployed Contract address
const logicAddress = "0x17a2c7f42339610B6bB101Bb868247336e121D51"; // Testnet
const bolideAddress = "0x69982234CC74c2696b4A7d1D9702926A48775C28"; // Testnet

// Testnet Contract
const BUSDAddress = "0x8516Fc284AEEaa0374E66037BD2309349FF728eA"; // Testnet

// Testnet contract address for real-time deployment (BSC)
const venusControlerAddress = "0xfD36E2c2a6789Db23113685031d7F16329158384";
const olaControllerAddress = "0xAD48B2C9DC6709a560018c678e918253a65df86e";
const olaRainMakerAddress = "0x5CB93C0AdE6B7F2760Ec4389833B0cCcb5e4efDa";
const pancakeRouterAddress = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1"; // Testnet
const apeswapRouterAddress = "0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7";
const biswapRouterAddress = "0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8";
const pancakeMasterAddress = "0x1ED62c7b76AD29Bfb80F3329d1ce7e760aAD153d"; // Testnet
const apeswapMasterAddress = "0x5c8D727b265DBAfaba67E050f2f739cAeEB4A6F9";
const biswapMasterAddress = "0xDbc1A13490deeF9c3C12b44FE77b503c1B061739";

const pancakeWBNBAddress = "0xae13d989dac2f0debff460ac112a837c89baa7cd"; // Testnet
const pancakeCAKEAddress = "0xfa60d973f7642b748046464e165a65b7323b0dee"; // Testnet (from PancakeMaster)
const pancakeSYRUPAddress = "0xa75d781e9d83b02a28d78f0a6b5cd2f203cf8a82"; // Testnet (from PancakeMaster)
const pancakeLP_CAKE_WBNB_TokenAddress =
  "0xa96818CA65B57bEc2155Ba5c81a70151f63300CD"; // Testnet
const pancakeLP_CAKE_BUSD_TokenAddress =
  "0xb98C30fA9f5e9cf6749B7021b4DDc0DBFe73b73e"; // Testnet
const pancakeLP_CAKE_BUSD_PID = 5; // Testnet (from PancakeMaster)

// Initialize Contract
const CAKE = new ethers.Contract(pancakeCAKEAddress, cakeAbi, owner);
const SYRUP = new ethers.Contract(pancakeSYRUPAddress, erc20Abi, owner);
const BUSD = new ethers.Contract(BUSDAddress, erc20Abi, owner);
const WBNB = new ethers.Contract(pancakeWBNBAddress, erc20Abi, owner);
const pancakeLP_CAKE_BUSD = new ethers.Contract(
  pancakeLP_CAKE_BUSD_TokenAddress,
  erc20Abi,
  owner
);
const pancakeLP_CAKE_WBNB = new ethers.Contract(
  pancakeLP_CAKE_WBNB_TokenAddress,
  erc20Abi,
  owner
);

// Variables for deployed contract
let logic: Logic, bolide: Bolide;
let startTime: typeof time;

export const logic_masterchef = () => {
  before(async () => {
    logic = Logic__factory.connect(logicAddress, owner) as Logic;

    bolide = Bolide__factory.connect(bolideAddress, owner) as Bolide;
  });

  describe("Preparation", async () => {
    it("Transfer CAKE to logic contract", async () => {
      await CAKE.connect(owner).transfer(logic.address, 1000000000);
    });
  });

  describe("Pancakeswap", async () => {
    describe("Staking", async () => {
      it("Approve MasterChef on CAKE", async () => {
        await logic.connect(owner).approveTokenForSwap(CAKE.address);
      });

      describe("enterStaking", async () => {
        it("Only admin or owner can process", async () => {
          await expect(
            logic.connect(other).enterStaking(pancakeMasterAddress, 100000000)
          ).to.be.revertedWith('"reason":"execution reverted: OA2"');
        });

        it("Only allowed swapMaster address", async () => {
          await expect(
            logic.connect(owner).enterStaking(other.address, 100000000)
          ).to.be.revertedWith('"reason":"execution reverted: E4"');
        });

        it("Cannot enter staking over CAKE balance", async () => {
          await expect(
            logic
              .connect(owner)
              .enterStaking(
                pancakeMasterAddress,
                ethers.utils.parseEther("1000")
              )
          ).to.be.revertedWith(
            '"reason":"execution reverted: BEP20: transfer amount exceeds balance"'
          );
        });

        it("enterStaking with CAKE", async () => {
          let balanceCAKE = await CAKE.balanceOf(logic.address);
          let balanceSYRUP = await SYRUP.balanceOf(logic.address);

          const tx = await logic
            .connect(owner)
            .enterStaking(pancakeMasterAddress, 1000);
          await tx.wait(1);

          let balanceCAKENew = await CAKE.balanceOf(logic.address);
          let balanceSYRUPNew = await SYRUP.balanceOf(logic.address);

          expect(balanceCAKENew.add("1000").toString()).to.be.eql(
            balanceCAKE.toString(),
            "CAKE balance of logic should be decreased by 1000"
          );
          expect(balanceSYRUP.add("1000").toString()).to.be.eql(
            balanceSYRUPNew.toString(),
            "SYRUP balance of logic should be increased by 1000"
          );
        });
      });

      describe("leaveStaking", async () => {
        it("Only admin or owner can process", async () => {
          await expect(
            logic.connect(other).leaveStaking(pancakeMasterAddress, 100000000)
          ).to.be.revertedWith('"reason":"execution reverted: OA2"');
        });

        it("Only allowed swapMaster address", async () => {
          await expect(
            logic.connect(owner).leaveStaking(other.address, 100000000)
          ).to.be.revertedWith('"reason":"execution reverted: E4"');
        });

        it("Cannot leave staking over SYRUP balance", async () => {
          await expect(
            logic
              .connect(owner)
              .leaveStaking(
                pancakeMasterAddress,
                ethers.utils.parseEther("1000")
              )
          ).to.be.revertedWith(
            '"reason":"execution reverted: withdraw: not good"'
          );
        });

        it("leaveStaking with SYRUP", async () => {
          let balanceCAKE = await CAKE.balanceOf(logic.address);
          let balanceSYRUP = await SYRUP.balanceOf(logic.address);

          const tx = await logic
            .connect(owner)
            .leaveStaking(pancakeMasterAddress, 1000);
          await tx.wait(1);

          let balanceCAKENew = await CAKE.balanceOf(logic.address);
          let balanceSYRUPNew = await SYRUP.balanceOf(logic.address);

          expect(balanceCAKE.add("1000").toString()).to.be.eql(
            balanceCAKENew.toString(),
            "CAKE balance of logic should be increased by 1000"
          );
          expect(balanceSYRUPNew.add("1000").toString()).to.be.eql(
            balanceSYRUP.toString(),
            "SYRUP balance of logic should be decreased by 1000"
          );
        });
      });
    });

    describe("Deposit/Withdraw LP", async () => {
      describe("Preparation", async () => {
        it("Approve MasterChef on BUSD", async () => {
          await logic.connect(owner).approveTokenForSwap(BUSD.address);
        });

        it("Approve MasterChef on CAKE-BUSD LP Token", async () => {
          await logic
            .connect(owner)
            .approveTokenForSwap(pancakeLP_CAKE_BUSD.address);
        });

        it("swap CAKE for BUSD", async () => {
          startTime = await time.latest();
          const tx = await logic
            .connect(owner)
            .swapExactTokensForTokens(
              pancakeRouterAddress,
              "500000000",
              0,
              [CAKE.address, BUSD.address],
              startTime.add(time.duration.minutes(10)).toString()
            );
          await tx.wait(1);
        });

        it("addLiquidity with CAKE, BUSD", async () => {
          startTime = await time.latest();
          const tx = await logic
            .connect(owner)
            .addLiquidity(
              pancakeRouterAddress,
              CAKE.address,
              BUSD.address,
              300000000,
              100000,
              0,
              0,
              startTime.add(time.duration.minutes(10)).toString()
            );
          await tx.wait(1);
        });
      });

      describe("Deposit LP to MasterChef", async () => {
        it("Only admin or owner can process", async () => {
          await expect(
            logic
              .connect(other)
              .deposit(pancakeMasterAddress, pancakeLP_CAKE_BUSD_PID, 100000000)
          ).to.be.revertedWith('"reason":"execution reverted: OA2"');
        });

        it("Only allowed swapMaster address", async () => {
          await expect(
            logic
              .connect(owner)
              .deposit(other.address, pancakeLP_CAKE_BUSD_PID, 100000000)
          ).to.be.revertedWith('"reason":"execution reverted: E4"');
        });

        it("Pool ID should be exist", async () => {
          await expect(
            logic.connect(owner).deposit(pancakeMasterAddress, "99999999999", 1)
          ).to.be.reverted;
        });

        it("Deposit amount cannot over than LP balance", async () => {
          await expect(
            logic
              .connect(owner)
              .deposit(
                pancakeMasterAddress,
                pancakeLP_CAKE_BUSD_PID,
                ethers.utils.parseEther("1000").toString()
              )
          ).to.be.revertedWith(
            '"reason":"execution reverted: ds-math-sub-underflow"'
          );
        });

        it("Deposit to MasterChef in CAKE-BUSD LP Pool", async () => {
          let balanceLogic = await pancakeLP_CAKE_BUSD.balanceOf(logic.address);
          let balanceMaster = await pancakeLP_CAKE_BUSD.balanceOf(
            pancakeMasterAddress
          );

          const tx = await logic
            .connect(owner)
            .deposit(pancakeMasterAddress, pancakeLP_CAKE_BUSD_PID, "100000");
          await tx.wait(1);

          let balanceLogicNew = await pancakeLP_CAKE_BUSD.balanceOf(
            logic.address
          );
          let balanceMasterNew = await pancakeLP_CAKE_BUSD.balanceOf(
            pancakeMasterAddress
          );

          expect(balanceLogicNew.add("100000").toString()).to.be.eql(
            balanceLogic.toString(),
            "LP balance of logic should be decreased by 1000000"
          );
          expect(balanceMaster.add("100000").toString()).to.be.eql(
            balanceMasterNew.toString(),
            "LP balance of MasterChef should be increased by 1000000"
          );
        });
      });

      describe("Withdraw LP from MasterChef", async () => {
        it("Only admin or owner can process", async () => {
          await expect(
            logic
              .connect(other)
              .withdraw(
                pancakeMasterAddress,
                pancakeLP_CAKE_BUSD_PID,
                100000000
              )
          ).to.be.revertedWith('"reason":"execution reverted: OA2"');
        });

        it("Only allowed swapMaster address", async () => {
          await expect(
            logic
              .connect(owner)
              .withdraw(other.address, pancakeLP_CAKE_BUSD_PID, 100000000)
          ).to.be.revertedWith('"reason":"execution reverted: E4"');
        });

        it("Pool ID should be exist", async () => {
          await expect(
            logic
              .connect(owner)
              .withdraw(pancakeMasterAddress, "99999999999", 1)
          ).to.be.reverted;
        });

        it("Withdraw amount cannot over than LP balance", async () => {
          await expect(
            logic
              .connect(owner)
              .withdraw(
                pancakeMasterAddress,
                pancakeLP_CAKE_BUSD_PID,
                ethers.utils.parseEther("1000").toString()
              )
          ).to.be.revertedWith(
            '"reason":"execution reverted: withdraw: not good"'
          );
        });

        it("Withdraw from MasterChef in CAKE-BUSD LP Pool", async () => {
          let balanceLogic = await pancakeLP_CAKE_BUSD.balanceOf(logic.address);
          let balanceMaster = await pancakeLP_CAKE_BUSD.balanceOf(
            pancakeMasterAddress
          );

          const tx = await logic
            .connect(owner)
            .withdraw(pancakeMasterAddress, pancakeLP_CAKE_BUSD_PID, "100000");
          await tx.wait(1);

          let balanceLogicNew = await pancakeLP_CAKE_BUSD.balanceOf(
            logic.address
          );
          let balanceMasterNew = await pancakeLP_CAKE_BUSD.balanceOf(
            pancakeMasterAddress
          );

          expect(balanceLogic.add("100000").toString()).to.be.eql(
            balanceLogicNew.toString(),
            "LP balance of logic should be increased by 1000000"
          );
          expect(balanceMasterNew.add("100000").toString()).to.be.eql(
            balanceMaster.toString(),
            "LP balance of MasterChef should be decreased by 1000000"
          );
        });
      });

      describe("Rollback preparation", async () => {
        it("removeRequidity with CAKE, BUSD", async () => {
          startTime = await time.latest();
          let balanceLP = await pancakeLP_CAKE_BUSD.balanceOf(logic.address);
          const tx = await logic
            .connect(owner)
            .removeLiquidity(
              pancakeRouterAddress,
              CAKE.address,
              BUSD.address,
              balanceLP.toString(),
              0,
              0,
              startTime.add(time.duration.minutes(10)).toString()
            );
          await tx.wait(1);
        });

        it("swap BUSD for CAKE", async () => {
          startTime = await time.latest();
          let balanceBUSD = await BUSD.balanceOf(logic.address);
          const tx = await logic
            .connect(owner)
            .swapExactTokensForTokens(
              pancakeRouterAddress,
              balanceBUSD.toString(),
              0,
              [BUSD.address, CAKE.address],
              startTime.add(time.duration.minutes(10)).toString()
            );
          await tx.wait(1);
        });
      });
    });
  });
};
