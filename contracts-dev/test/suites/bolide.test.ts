/*******************************************
 * Test on hardhat
 *******************************************/
import {ethers} from "hardhat";
import {expect} from "chai";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {Bolide} from "../../typechain-types";

export const bolide = () => {
  let bolid: Bolide;
  let owner: SignerWithAddress,
    account_0: SignerWithAddress,
    account_1: SignerWithAddress;

  before(async () => {
    [owner, account_0, account_1] = await ethers.getSigners();
    const Bolide = await ethers.getContractFactory("Bolide", owner);

    bolid = (await Bolide.deploy("1000000000000000000000000")) as Bolide;
  });

  describe("deployment", async () => {
    it("deploys successfully", async () => {
      const address = bolid.address;
      expect(address).to.be.not.eql(0.0);
      expect(address).to.be.not.eql("");
      expect(address).to.be.not.eql(null);
      expect(address).to.be.not.eql(undefined);
    });

    it("has a name", async () => {
      const name = await bolid.name();
      expect(name).to.be.eql("Bolide");
    });
    it("has a symbol", async () => {
      const symbol = await bolid.symbol();
      expect(symbol).to.be.eql("BLID");
    });
    it("cap equal 1000000000000000000000000", async () => {
      let cap = await bolid.cap();
      expect(cap.toString()).to.be.eql("1000000000000000000000000");
    });
  });

  describe("mint, transfer , burn", async () => {
    it("non-owner cannot mint ", async () => {
      await expect(
        bolid.connect(account_1).mint(account_1.address, 365 * 5 * 20)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("cannot mint mor cap", async () => {
      await expect(
        bolid
          .connect(account_1)
          .mint(account_1.address, "2000000000000000000000000")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("owner can mint more cap", async () => {
      const result = await bolid
        .connect(owner)
        .mint(account_1.address, 365 * 5 * 20);
      let balance = await bolid.balanceOf(account_1.address);
      expect(365 * 5 * 20).to.be.eql(balance.toNumber());
    });

    it("cannot transfer more than the balance", async () => {
      await expect(
        bolid.connect(account_1).transfer(account_0.address, 10000000000)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
    it("transfer", async () => {
      const result = await bolid
        .connect(account_1)
        .transfer(account_0.address, 10);
      let balance = await bolid.balanceOf(account_1.address);
      expect((36490).toString()).to.be.eql(balance.toString());
      balance = await bolid.balanceOf(account_0.address);
      expect((10).toString()).to.be.eql(balance.toString());
    });
    it("cannot burn more than the balance", async () => {
      await expect(bolid.connect(account_1).burn(10000000000000)).to.be
        .reverted;
    });
    it("burn", async () => {
      const result = await bolid.connect(account_1).burn(10);
      let balance = await bolid.balanceOf(account_1.address);
      expect((36480).toString()).to.be.eql(balance.toString());
    });
    it("approve", async () => {
      await bolid.connect(account_0).approve(account_1.address, 10);
      let balance = await bolid.allowance(account_0.address, account_1.address);
      expect((10).toString()).to.be.eql(balance.toString());
    });

    it("transferFrom exeption", async () => {
      await expect(
        bolid
          .connect(account_1)
          .transferFrom(account_1.address, account_0.address, 10)
      ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
      await expect(
        bolid
          .connect(account_1)
          .transferFrom(account_0.address, account_1.address, 20)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("transferFrom", async () => {
      const result = await bolid
        .connect(account_1)
        .transferFrom(account_0.address, account_1.address, 10);
      let balance = await bolid.balanceOf(account_1.address);
      expect((36490).toString()).to.be.eql(balance.toString());
    });
  });
};
