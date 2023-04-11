/*******************************************
 * Test on hardhat
 *******************************************/

import {ethers} from "hardhat";
import {expect} from "chai";
import {time} from "@openzeppelin/test-helpers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {Bolide, TreasuryVester} from "../../typechain-types";

//require("chai").use(require("chai-as-promised")).should();

export const treasuryVester = () => {
  let blid: Bolide, treasuryVester: TreasuryVester, startTime: typeof time;
  let owner: SignerWithAddress,
    recipient: SignerWithAddress,
    recipient2: SignerWithAddress;

  before(async () => {
    [owner, recipient, recipient2] = await ethers.getSigners();

    const Bolide = await ethers.getContractFactory("Bolide", owner);

    blid = (await Bolide.deploy("1000000000000000000000000")) as Bolide;
  });

  describe("bad deployment", async () => {
    it("vesting can not begin too early", async () => {
      startTime = await time.latest();

      const TreasuryVester = await ethers.getContractFactory(
        "TreasuryVester",
        owner
      );
      await expect(
        TreasuryVester.deploy(
          blid.address,
          recipient.address,
          "100000000",
          startTime.sub(time.duration.days(1)).toString(),
          startTime.toString(),
          startTime.add(time.duration.days(1)).toString()
        )
      ).to.be.revertedWith(
        "TreasuryVester::constructor: vesting begin too early"
      );
    });

    it("cliff can not is too early", async () => {
      startTime = await time.latest();

      const TreasuryVester = await ethers.getContractFactory(
        "TreasuryVester",
        owner
      );

      await expect(
        TreasuryVester.deploy(
          blid.address,
          recipient.address,
          "100000000",
          startTime.add(time.duration.days(1)).toString(),
          startTime.add(time.duration.hours(1)).toString(),
          startTime.add(time.duration.days(2)).toString()
        )
      ).to.be.revertedWith("TreasuryVester::constructor: cliff is too early");
    });

    it("end can not is earlier then cliff", async () => {
      startTime = await time.latest();

      const TreasuryVester = await ethers.getContractFactory(
        "TreasuryVester",
        owner
      );

      await expect(
        TreasuryVester.deploy(
          blid.address,
          recipient.address,
          "100000000",
          startTime.add(time.duration.days(1)).toString(),
          startTime.add(time.duration.days(3)).toString(),
          startTime.add(time.duration.days(2)).toString()
        )
      ).to.be.revertedWith("TreasuryVester::constructor: end is too early");
    });
  });

  describe("standart scene", async () => {
    before("deploy", async () => {
      startTime = await time.latest();

      const TreasuryVester = await ethers.getContractFactory(
        "TreasuryVester",
        owner
      );

      treasuryVester = (await TreasuryVester.deploy(
        blid.address,
        recipient.address,
        "1000000",
        startTime.add(time.duration.days(1)).toString(),
        startTime.add(time.duration.days(2)).toString(),
        startTime.add(time.duration.days(3)).toString()
      )) as TreasuryVester;

      await blid
        .connect(owner)
        .mint(treasuryVester.address, "1000000000000000000000000");
    });

    it("only owner can call setRecipient", async () => {
      await expect(
        treasuryVester.connect(recipient).setRecipient(owner.address)
      ).to.be.revertedWith("TreasuryVester::setRecipient: unauthorized");
    });

    it("setRecipient", async () => {
      await treasuryVester.connect(owner).setRecipient(recipient2.address);
    });

    it("can not claim under cliff", async () => {
      await expect(
        treasuryVester.connect(recipient2).claim()
      ).to.be.revertedWith("TreasuryVester::claim: not time yet");
    });

    it("claim first half", async () => {
      await time.increaseTo(startTime.add(time.duration.days(2)));
      await treasuryVester.connect(recipient2).claim();
      let balance = await blid.balanceOf(recipient2.address);
      balance = balance.div(10000000000);

      expect(Number.parseInt(balance.toString())).closeTo(
        50000000000000,
        10 ** 9
      );
    });

    it("claim second half", async () => {
      await time.increaseTo(startTime.add(time.duration.days(3)));
      await treasuryVester.connect(recipient2).claim();
      let balance = await blid.balanceOf(recipient2.address);
      expect(balance.toString()).to.be.eql("1000000000000000000000000");
    });
  });
};
