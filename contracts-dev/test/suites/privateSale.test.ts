/*******************************************
 * Test on hardhat
 *******************************************/
import {ethers} from "hardhat";
import {expect} from "chai";
import {
  AggregatorN2,
  ERC20,
  Bolide,
  TokenVestingGroup,
  PrivateSale,
} from "../../typechain-types";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {time} from "@openzeppelin/test-helpers";

//module.exports.privateSale = () => {
export const privateSale = () => {
  const tokenVestingGroupJSON = require("../../artifacts/contracts/private_sale/TokenVestingGroup.sol/TokenVestingGroup.json");
  const day = 24 * 60 * 60;

  let startTime: typeof time;
  let result, vesting: TokenVestingGroup;
  let timestamp = Date.now();
  timestamp = timestamp - (timestamp % (day * 1000));
  timestamp /= 1000;

  let blid: Bolide,
    usdt: ERC20,
    privateSale: PrivateSale,
    aggregatorN3: AggregatorN2;
  let owner: SignerWithAddress,
    logicContract: SignerWithAddress,
    Alexander: SignerWithAddress,
    Dmitry: SignerWithAddress,
    Victor: SignerWithAddress,
    newAdmin: SignerWithAddress,
    expenseAddress: SignerWithAddress,
    other: SignerWithAddress,
    vestingController: SignerWithAddress;

  before(async () => {
    [
      owner,
      logicContract,
      Alexander,
      Dmitry,
      Victor,
      newAdmin,
      expenseAddress,
      other,
      vestingController,
    ] = await ethers.getSigners();

    const Aggregator = await ethers.getContractFactory("AggregatorN2", owner);
    aggregatorN3 = (await Aggregator.deploy()) as AggregatorN2;

    const PrivateSale = await ethers.getContractFactory("PrivateSale", owner);
    privateSale = (await PrivateSale.deploy()) as PrivateSale;

    const Bolide = await ethers.getContractFactory("Bolide", owner);
    blid = (await Bolide.deploy("1000000000000000000000000")) as Bolide;

    const USDT = await ethers.getContractFactory("ERC20", owner);
    usdt = (await USDT.deploy("some erc20", "SERC")) as ERC20;

    await blid
      .connect(owner)
      .mint(vestingController.address, "600000000000000000000000");
    await blid
      .connect(owner)
      .mint(privateSale.address, "400000000000000000000000");

    startTime = (await time.latest()).add(time.duration.days(1));
  });
  before(async () => {
    await usdt.connect(owner).transfer(Alexander.address, 10000000000);
    await usdt.connect(owner).transfer(Dmitry.address, 10000000000);
    await usdt.connect(owner).transfer(Victor.address, 10000000000);
  });

  describe("deployment", async () => {
    it("deploys BLID successfully", async () => {
      const address = await blid.address;
      expect(address).to.be.not.eql(0x0);
      expect(address).to.be.not.eql("");
      expect(address).to.be.not.eql(null);
      expect(address).to.be.not.eql(undefined);
    });

    it("deploys privateSale successfully", async () => {
      const address = await privateSale.address;
      expect(address).to.be.not.eql(0x0);
      expect(address).to.be.not.eql("");
      expect(address).to.be.not.eql(null);
      expect(address).to.be.not.eql(undefined);
    });

    it("deploys usdt successfully", async () => {
      const address = await usdt.address;
      expect(address).to.be.not.eql(0x0);
      expect(address).to.be.not.eql("");
      expect(address).to.be.not.eql(null);
      expect(address).to.be.not.eql(undefined);
    });
  });

  describe("setting up a contract", async () => {
    it("can not add new round when unset  BLID ", async () => {
      await expect(
        privateSale.connect(owner).newRound({
          _tokenRate: 123,
          _maxMoney: 0,
          _sumTokens: 0,
          _startTimestamp: 0,
          _endTimestamp: 0,
          _minimumSaleAmount: 0,
          _maximumSaleAmount: 0,
          _duration: 1,
          _durationCount: 1,
          _lockup: 0,
          _typeRound: 1,
          _percentOnInvestorWallet: 0,
          _burnable: false,
          _open: false,
        })
      ).to.be.revertedWith("BLID is not set");
    });

    it("not admin can not add BLID", async () => {
      await expect(
        privateSale.connect(Alexander).setBLID(blid.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("add BLID", async () => {
      await privateSale.connect(owner).setBLID(blid.address);
    });

    it("can not add BLID aftre setBLID", async () => {
      await expect(
        privateSale.connect(owner).setBLID(blid.address)
      ).to.be.revertedWith("BLID was set");
    });

    it("not admin can not add expenseAddress", async () => {
      await expect(
        privateSale.connect(Alexander).setExpenseAddress(expenseAddress.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("can not add new round when unset  expenseAddress and _procentOnLogicContract do not set 100", async () => {
      await expect(
        privateSale.connect(owner).newRound({
          _tokenRate: 123,
          _maxMoney: 0,
          _sumTokens: 0,
          _startTimestamp: 0,
          _endTimestamp: 0,
          _minimumSaleAmount: 0,
          _maximumSaleAmount: 0,
          _duration: 1,
          _durationCount: 1,
          _lockup: 0,
          _typeRound: 1,
          _percentOnInvestorWallet: 0,
          _burnable: false,
          _open: false,
        })
      ).to.be.revertedWith("Require set expense address ");
    });

    it("add expenseAddress", async () => {
      await privateSale
        .connect(owner)
        .setExpenseAddress(expenseAddress.address);
    });

    it("not admin can not add logicContract", async () => {
      await expect(
        privateSale.connect(Alexander).setInvestorWallet(logicContract.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("can not add new round when unset  expenseAddress and _procentOnLogicContract do not set 0", async () => {
      await expect(
        privateSale.connect(owner).newRound({
          _tokenRate: 123,
          _maxMoney: 0,
          _sumTokens: 0,
          _startTimestamp: 0,
          _endTimestamp: 0,
          _minimumSaleAmount: 0,
          _maximumSaleAmount: 0,
          _duration: 1,
          _durationCount: 1,
          _lockup: 0,
          _typeRound: 1,
          _percentOnInvestorWallet: 100,
          _burnable: false,
          _open: false,
        })
      ).to.be.revertedWith("Require set Logic contract");
    });

    it("add Logic contract", async () => {
      await privateSale.connect(owner).setInvestorWallet(logicContract.address);
    });

    it("not admin can not add token ", async () => {
      await expect(
        privateSale
          .connect(Alexander)
          .addToken(usdt.address, aggregatorN3.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("admin can add token ", async () => {
      await privateSale
        .connect(owner)
        .addToken(usdt.address, aggregatorN3.address);
    });
  });

  describe("close round type 1,burnable", async () => {
    it("can not finish round  if round has not been created ", async () => {
      await expect(privateSale.connect(owner).finishRound()).to.be.revertedWith(
        "Last round has been finished"
      );
    });

    it("can not сancel round  if round has not been created", async () => {
      await expect(privateSale.connect(owner).cancelRound()).to.be.revertedWith(
        "Last round has been finished"
      );
    });

    it("сan not add in white list if round has not been created", async () => {
      await expect(
        privateSale.connect(owner).addWhiteList(Alexander.address)
      ).to.be.revertedWith("Last round has  been finished");
    });

    it("create new round burnable ", async () => {
      await privateSale.connect(owner).newRound({
        _tokenRate: "5000000000000000000",
        _maxMoney: 0,
        _sumTokens: 1000000000000000,
        _startTimestamp: 0,
        _endTimestamp: 0,
        _minimumSaleAmount: 250000,
        _maximumSaleAmount: 1000000,
        _duration: day,
        _durationCount: 4,
        _lockup: 200,
        _typeRound: 1,
        _percentOnInvestorWallet: 40,
        _burnable: true,
        _open: false,
      });
    });

    it("can not deposit  if token was not added ", async () => {
      await expect(
        privateSale.connect(owner).deposit(500000, logicContract.address)
      ).to.be.revertedWith("Token is not used ");
    });

    it("can not deposit  when your account add to white list", async () => {
      await expect(
        privateSale.connect(Alexander).deposit(500000, usdt.address)
      ).to.be.revertedWith("No access");
    });

    it("not admin can not add in white list", async () => {
      await expect(
        privateSale.connect(Dmitry).addWhiteList(Alexander.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("add in white list", async () => {
      await privateSale.connect(owner).addWhiteList(Alexander.address);
    });

    it("can not deposit  when sum approve for PrivateSale", async () => {
      await expect(
        privateSale.connect(Alexander).deposit(250000, usdt.address)
      ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
    });
    it("can not make a deposit when minAmount more than amount ", async () => {
      await usdt.connect(Alexander).approve(privateSale.address, 2000);
      await expect(
        privateSale.connect(Alexander).deposit(2000, usdt.address)
      ).to.be.revertedWith("Minimum sale amount more than your amount");
    });

    it("can not make a deposit when amount more than maxAmount ", async () => {
      await usdt.connect(Alexander).approve(privateSale.address, 20000000);
      await expect(
        privateSale.connect(Alexander).deposit(20000000, usdt.address)
      ).to.be.revertedWith("Your amount more than maximum sale amount");
    });

    it("deposit", async () => {
      await usdt.connect(Alexander).approve(privateSale.address, 500000);
      await privateSale.connect(Alexander).deposit(500000, usdt.address);
    });

    it("the second time you cannot make a deposit", async () => {
      await usdt.connect(Alexander).approve(privateSale.address, 500000);
      await expect(
        privateSale.connect(Alexander).deposit(500000, usdt.address)
      ).to.be.revertedWith("You  have already made a deposit");
    });

    it("balance expenseAddress before finish", async () => {
      let balance = await usdt.balanceOf(expenseAddress.address);
      expect((0).toString()).to.be.eql(balance.toString());
      balance = await usdt.balanceOf(logicContract.address);
      expect((0).toString()).to.be.eql(balance.toString());
    });

    it("finish round", async () => {
      await privateSale.connect(owner).finishRound();
    });

    it("balance expenseAddress after finish", async () => {
      let balance = await usdt.balanceOf(expenseAddress.address);
      expect((300000).toString()).to.be.eql(balance.toString());
      balance = await usdt.balanceOf(logicContract.address);
      expect((200000).toString()).to.be.eql(balance.toString());
    });

    it("claim", async () => {
      result = await privateSale.connect(Alexander).getVestingAddress(0);
      vesting = new ethers.Contract(
        result,
        tokenVestingGroupJSON.abi,
        owner
      ) as TokenVestingGroup;
    });

    it("balance is zero at first", async () => {
      let balance = await vesting.releasableAmount();
      expect((0).toString()).to.be.eql(balance.toString());
      await expect(vesting.claim()).to.be.revertedWith(
        "TokenVesting: no tokens are due"
      );

      balance = await blid.balanceOf(other.address);
      expect((0).toString()).to.be.eql(balance.toString());
    });

    it("after one day the balance is increased by   1 / 4 all deposit", async () => {
      startTime = startTime.add(time.duration.days(1));
      await time.increaseTo(startTime);
      await vesting.connect(Alexander).claim();
      let balance = await blid.balanceOf(Alexander.address);
      expect((25000).toString()).to.be.eql(balance.toString());
    });

    it("check burning BLID", async () => {
      let balance = await blid.totalSupply();
      expect("999999999000000000199994").to.be.eql(balance.toString());
    });
  });

  describe("close round type 1,burnable", async () => {
    it("create new round burnable ", async () => {
      await privateSale.connect(owner).newRound({
        _tokenRate: "5000000000000000000",
        _maxMoney: 0,
        _sumTokens: 1000000000000000,
        _startTimestamp: 0,
        _endTimestamp: 0,
        _minimumSaleAmount: 250000,
        _maximumSaleAmount: 1000000,
        _duration: day,
        _durationCount: 4,
        _lockup: 200,
        _typeRound: 1,
        _percentOnInvestorWallet: 40,
        _burnable: false,
        _open: true,
      });
    });

    it("deposit", async () => {
      await usdt.connect(Alexander).approve(privateSale.address, 500000);
      await privateSale.connect(Alexander).deposit(500000, usdt.address);
    });

    it("balance investor before finish", async () => {
      let balance = await usdt.balanceOf(Alexander.address);
      expect((9999000000).toString()).to.be.eql(balance.toString());
    });

    it("finish round", async () => {
      await privateSale.connect(owner).cancelRound();
    });

    it("return token", async () => {
      result = await privateSale.connect(Alexander).returnDeposit(1);
      let balance = await usdt.balanceOf(Alexander.address);
      expect((9999500000).toString()).to.be.eql(balance.toString());
    });
  });

  describe("open  round type 2, not burnable", async () => {
    it("create new round ", async () => {
      startTime = await time.latest();
      const timestamp2: typeof time = startTime.add(time.duration.days(2));
      const timestamp3: typeof time = startTime.add(time.duration.days(3));
      await privateSale.connect(owner).newRound({
        _tokenRate: 0,
        _maxMoney: 0,
        _sumTokens: 1000000000000000,
        _startTimestamp: timestamp2.toString(),
        _endTimestamp: timestamp3.toString(),
        _minimumSaleAmount: 0,
        _maximumSaleAmount: 0,
        _duration: day,
        _durationCount: 4,
        _lockup: 0,
        _typeRound: 2,
        _percentOnInvestorWallet: 40,
        _burnable: false,
        _open: true,
      });
    });

    it("can not deposit round dont start", async () => {
      await usdt.connect(Alexander).approve(privateSale.address, 500000);
      await expect(
        privateSale.connect(Alexander).deposit(500000, usdt.address)
      ).to.be.revertedWith("Round dont start");
      await usdt.connect(Alexander).approve(privateSale.address, 500000);
      await expect(
        privateSale.connect(Alexander).deposit(1000000, usdt.address)
      ).to.be.revertedWith("Round dont start");
    });

    it("deposit", async () => {
      startTime = startTime.add(
        time.duration.days(2).add(time.duration.seconds(1))
      );
      await time.increaseTo(startTime);

      let result = await usdt
        .connect(Alexander)
        .approve(privateSale.address, 500000);
      await privateSale.connect(Alexander).deposit(500000, usdt.address);
      await usdt.connect(Dmitry).approve(privateSale.address, 500000);
      await privateSale.connect(Dmitry).deposit(500000, usdt.address);
    });

    it("the second time you cannot make a deposit", async () => {
      await usdt.connect(Alexander).approve(privateSale.address, 500000);
      await expect(
        privateSale.connect(Alexander).deposit(500000, usdt.address)
      ).to.be.revertedWith("You  have already made a deposit");
    });

    it("can not deposit after end timestamp", async () => {
      startTime = startTime.add(time.duration.days(1));
      await time.increaseTo(startTime);

      let result = await usdt
        .connect(Victor)
        .approve(privateSale.address, 500000);
      await expect(
        privateSale.connect(Victor).deposit(500000, usdt.address)
      ).to.be.revertedWith("Round is ended, round time expired");
    });

    it("balance expenseAddress before finish", async () => {
      let balance = await usdt.balanceOf(expenseAddress.address);
      expect((300000).toString()).to.be.eql(balance.toString());
      balance = await usdt.balanceOf(logicContract.address);
      expect((200000).toString()).to.be.eql(balance.toString());
    });

    it("finish round", async () => {
      await privateSale.connect(owner).finishRound();
    });

    it("balance expenseAddress after finish", async () => {
      let balance = await usdt.balanceOf(expenseAddress.address);
      expect((900000).toString()).to.be.eql(balance.toString());
      balance = await usdt.balanceOf(logicContract.address);
      expect((600000).toString()).to.be.eql(balance.toString());
    });

    it("claim", async () => {
      result = await privateSale.connect(Alexander).getVestingAddress(2);
      vesting = new ethers.Contract(
        result,
        tokenVestingGroupJSON.abi,
        owner
      ) as TokenVestingGroup;
    });

    it("balance is zero at first", async () => {
      let balance = await vesting.releasableAmount();
      expect((0).toString()).to.be.eql(balance.toString());
      await expect(vesting.claim()).to.be.revertedWith(
        "TokenVesting: no tokens are due"
      );
      balance = await blid.balanceOf(Alexander.address);
      expect((25000).toString()).to.be.eql(balance.toString());
    });

    it("after one day the balance is increased by   1 / 4 all deposit", async () => {
      await time.increaseTo(
        startTime.add(time.duration.days(1)).add(time.duration.seconds(343))
      );
      await vesting.connect(Alexander).claim();
      let balance = await blid.balanceOf(Alexander.address);
      expect((125000000025000).toString()).to.be.eql(balance.toString());
    });

    it("СSR do not burn", async () => {
      let balance = await blid.totalSupply();
      expect("999999999000000000100000").to.be.eql(balance.toString());
    });
  });
};
