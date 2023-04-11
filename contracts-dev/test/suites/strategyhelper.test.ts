/*******************************************
 * Test on Hardhat
 * owner, other should have at least 5 balance of USDT, BUSD, LINK
 *******************************************/

 import dotenv from "dotenv";
import {ethers, upgrades} from "hardhat";
import {
  StrategyHelper__factory,
  StrategyHelper
} from "../../typechain-types";
import {logValue} from "../../utils/helpers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {ADDRESS_COLLECTION, PLATFORM} from "../../data/addresses.json";
import {expect, assert} from "chai";
import {BigNumber} from "ethers";

dotenv.config();
const provider = new ethers.providers.JsonRpcProvider(
  process.env.TESTNET_BSC_PROVIDER_URL,
  {name: "binance", chainId: 97}
);
const ADDRESSES = ADDRESS_COLLECTION.bscTestnet;

const owner = process.env.PRIVATE_KEY
  ? new ethers.Wallet(process.env.PRIVATE_KEY!, provider)
  : ethers.Wallet.createRandom();
const other = process.env.PRIVATE_KEY_1
  ? new ethers.Wallet(process.env.PRIVATE_KEY_1!, provider)
  : ethers.Wallet.createRandom();

export const strategyhelper = () => {
//describe("strategyhelper", async () => {
  let helper:StrategyHelper;

  before(async () => {

    const Helper = await ethers.getContractFactory("StrategyHelper", owner);
    helper = (await upgrades.deployProxy(Helper, [], {
      initializer: "__StrategyHelper_init",
    })) as StrategyHelper;
    await helper.deployed();
    
  });
  describe("Set Venus Info", async () => {
    it("Only owner can set Venus Info", async() => {
      expect(await helper.connect(other).setVenusAddress(
        ADDRESSES.VenusController, 
        ADDRESSES.VenusOraclePrice
      )).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Success set venus address", async () => {
      await helper.connect(owner).setVenusAddress(
        ADDRESSES.VenusController, 
        ADDRESSES.VenusOraclePrice
      );
    });
   
  });

  describe("getBorrowLimitUSD", async () => {
    it("getBorrowLimitUSD", async () => {
      const result = await helper.connect(owner).
      getStrategyBalance(await owner.address, [
         ADDRESSES.Token.USDT.Venus,
         ADDRESSES.Token.USDC.Venus
      ]);
      console.log('result', result);
    });
  });
};
