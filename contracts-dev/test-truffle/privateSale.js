const { contract ,accounts} = require('@openzeppelin/test-environment');
const { time } = require('@openzeppelin/test-helpers');
const [ owner,logicContract, Alexander,Dmitry, Victor,newAdmin,expenseAddress,logicContract2 ,vestingController] = accounts;
const AggregatorN3=contract.fromArtifact("AggregatorN3");



const Usdt = contract.fromArtifact("ERC20");
const TokenVestingGroup = contract.fromArtifact("TokenVestingGroup");
const Bolide = contract.fromArtifact("Bolide");
const PrivateSale = contract.fromArtifact("PrivateSale");

const day=24*60*60;

let result,vesting
let timestamp=Date.now();
timestamp=timestamp-timestamp%(day*1000);
timestamp/=1000
require('chai')
  .use(require('chai-as-promised'))
  .should()
describe('PrivateSale', () => {
  let blid,usdt,privateSale,aggregatorN3
  before(async () => {
     aggregatorN3=await AggregatorN3.new()
    privateSale = await PrivateSale.new({from: owner})
    blid = await Bolide.new("1000000000000000000000000",{from: owner});
    await blid.mint(vestingController,"600000000000000000000000",{from: owner})
    await blid.mint(privateSale.address,"400000000000000000000000",{from: owner})
    usdt = await Usdt.new("some erc20","SERC",{from: owner})
    startTime = (await time.latest()).add(time.duration.days(1))

  })
  before(async () => {
   
     await usdt.transfer(Alexander,10000000000,{from:owner})
     await usdt.transfer(Dmitry,10000000000,{from:owner})
     await usdt.transfer(Victor,10000000000,{from:owner})
   })

  describe('deployment', async () => {
   
    it('deploys BLID successfully', async () => {
      const address = await blid.address
      assert.notEqual(address, 0x0)
      assert.notEqual(address, '')
      assert.notEqual(address, null)
      assert.notEqual(address, undefined)
    })

    it('deploys privateSale successfully', async () => {
      const address = await privateSale.address
      assert.notEqual(address, 0x0)
      assert.notEqual(address, '')
      assert.notEqual(address, null)
      assert.notEqual(address, undefined)
    })
    
    it('deploys usdt successfully', async () => {
      const address = await usdt.address
      assert.notEqual(address, 0x0)
      assert.notEqual(address, '')
      assert.notEqual(address, null)
      assert.notEqual(address, undefined)
    })
  })
  
    describe('setting up a contract', async () => {

        
          it('can not add new round when unset  BLID ', async () => {
               await privateSale.newRound([123,0,0,0,0,0,0,1,1,0,1,0,false,false],{from:owner}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert BLID is not set -- Reason given: BLID is not set.");
          })
          
          it('not admin can not add BLID', async () => {
               await privateSale.setBLID(blid.address,{from:Alexander}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.");
          })

          it('add BLID', async () => {
               await privateSale.setBLID(blid.address,{from:owner})
          })

          it('can not add BLID aftre setBLID', async () => {
               await privateSale.setBLID(blid.address,{from:owner}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert BLID was set -- Reason given: BLID was set.");
          })

          it('not admin can not add expenseAddress', async () => {
               await privateSale.setExpenseAddress(expenseAddress,{from:Alexander}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.");
          })

          it('can not add new round when unset  expenseAddress and _procentOnLogicContract do not set 100', async () => {
               await privateSale.newRound([123,0,0,0,0,0,0,1,1,0,1,0,false,false],{from:owner}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert Require set expense address  -- Reason given: Require set expense address .");
          })
          
          it('add expenseAddress', async () => {
               await privateSale.setExpenseAddress(expenseAddress,{from:owner})
          })

          

          it('not admin can not add logicContract', async () => {
               await privateSale.setInvestorWallet(logicContract,{from:Alexander}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.");
          })

          it('can not add new round when unset  expenseAddress and _procentOnLogicContract do not set 0', async () => {
               await privateSale.newRound([123,0,0,0,0,0,0,1,1,0,1,100,false,false],{from:owner}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert Require set Logic contract -- Reason given: Require set Logic contract.");
          })
          
          it('add Logic contract', async () => {
               await privateSale.setInvestorWallet(logicContract,{from:owner})
          })



          it('not admin can not add token ', async () => {
             await privateSale.addToken(usdt.address,aggregatorN3.address,{from:Alexander}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.");
          })

          it('admin can add token ', async () => {
             await privateSale.addToken(usdt.address,aggregatorN3.address,{from:owner})
          })

          
    })

     describe('close round type 1,burnable', async () => {

          it('can not finish round  if round has not been created ', async () => {
               await privateSale.finishRound({from:owner}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert Last round has been finished -- Reason given: Last round has been finished.");
          })

          it('can not сancel round  if round has not been created', async () => {
               await privateSale.cancelRound({from:owner}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert Last round has been finished -- Reason given: Last round has been finished.");
          })
          
          it('сan not add in white list if round has not been created', async () => {
               await privateSale.addWhiteList(Alexander,{from:owner}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert Last round has  been finished -- Reason given: Last round has  been finished.")
          })

          it('create new round burnable ', async () => {
               await privateSale.newRound(["5000000000000000000",0,1000000000000000,0,0,250000,1000000,day,4,200,1,40,true,false],{from:owner})
          })

          it('can not deposit  if token was not added ', async () => {
               await privateSale.deposit(500000 ,logicContract,{from:owner}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert Token is not used  -- Reason given: Token is not used .");
          })

          it('can not deposit  when your account add to white list', async () => {
               await privateSale.deposit(500000 ,usdt.address,{from:Alexander}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert No access -- Reason given: No access.");
          })

          it(' not admin can not add in white list', async () => {
               await privateSale.addWhiteList(Alexander,{from:Dmitry}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.");
          })

          it('add in white list', async () => {
               await privateSale.addWhiteList(Alexander,{from:owner})
          })

          it('can not deposit  when sum approve for PrivateSale', async () => {
               await privateSale.deposit(250000 ,usdt.address,{from:Alexander}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert ERC20: transfer amount exceeds allowance -- Reason given: ERC20: transfer amount exceeds allowance.");
          })
          it('can not make a deposit when minAmount more than amount ', async () => {
               await usdt.approve(privateSale.address,2000,{from:Alexander})
               await privateSale.deposit(2000 ,usdt.address,{from:Alexander}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert Minimum sale amount more than your amount -- Reason given: Minimum sale amount more than your amount.");
          })

          it('can not make a deposit when amount more than maxAmount ', async () => {
               await usdt.approve(privateSale.address,20000000,{from:Alexander})
               await privateSale.deposit(20000000 ,usdt.address,{from:Alexander}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert  Your amount more than maximum sale amount -- Reason given:  Your amount more than maximum sale amount.");
          })


          it('deposit', async () => {
               await usdt.approve(privateSale.address,500000,{from:Alexander})
               await privateSale.deposit(500000 ,usdt.address,{from:Alexander})
          })

          it('the second time you cannot make a deposit', async () => {
               await usdt.approve(privateSale.address,500000,{from:Alexander})
               await privateSale.deposit(500000 ,usdt.address,{from:Alexander}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert You  have already made a deposit -- Reason given: You  have already made a deposit.");
          })

          it('balance expenseAddress before finish',async () => {
               let balance = await (usdt.balanceOf.call(expenseAddress))
               assert.equal((0).toString(), balance.toString())
               balance = await (usdt.balanceOf.call(logicContract))
               assert.equal((0).toString(), balance.toString())
          })
          
          it('finish round', async () => {
               await privateSale.finishRound({from:owner})
          })

          it('balance expenseAddress after finish',async () => {
               let balance = await (usdt.balanceOf.call(expenseAddress))
               assert.equal((300000).toString(), balance.toString())
               balance = await (usdt.balanceOf.call(logicContract))
               assert.equal((200000).toString(), balance.toString())
          })
          

          it('claim', async () => {
               result=await privateSale.getVestingAddress(0,{from:Alexander});
               vesting = await TokenVestingGroup.at(result);
               
          })

           it('balance is zero at first',async () => {
               let balance = await vesting.releasableAmount()
               assert.equal((0).toString(), balance.toString())
               let flag= false;
               try {
               await vesting.claim()
               } catch (error) {
               error.message.should.equal('Returned error: VM Exception while processing transaction: revert TokenVesting: no tokens are due -- Reason given: TokenVesting: no tokens are due.')
               flag=true;
               }
               flag.should.be.true;
               balance = await ( blid.balanceOf.call(accounts[1])); 
               assert.equal((0).toString(), balance.toString())
          })
           
          it('after one day the balance is increased by   1 / 4 all deposit',async () => {
               startTime=startTime.add(time.duration.days(1))
               await time.increaseTo(startTime)
               await vesting.claim({from: Alexander})
               let balance = await (blid.balanceOf.call(Alexander))
               assert.equal((25000).toString(), balance.toString())
          })
          
          it('check burning BLID',async () => {
               let balance = await (blid.totalSupply.call())
               assert.equal("999999999000000000100000", balance.toString())
          })

    })
  describe('close round type 1,burnable', async () => {

         
          it('create new round burnable ', async () => {
               await privateSale.newRound(["5000000000000000000",0,1000000000000000,0,0,250000,1000000,day,4,200,1,40,false,true],{from:owner})
          })



          it('deposit', async () => {
               await usdt.approve(privateSale.address,500000,{from:Alexander})
               await privateSale.deposit(500000 ,usdt.address,{from:Alexander})
          })

      

          it('balance investor before finish',async () => {
               let balance = await (usdt.balanceOf.call(Alexander))
               assert.equal((9999000000).toString(), balance.toString())
          })
          
          it('finish round', async () => {
               await privateSale.cancelRound({from:owner})
          })

          it('return token', async () => {
               result=await privateSale.returnDeposit(1,{from:Alexander});
               let balance = await (usdt.balanceOf.call(Alexander))
               assert.equal((9999500000).toString(), balance.toString())
          })

          
           
         
    })


    describe('open  round type 2, not burnable', async () => {
          it('create new round ', async () => {
               startTime = (await time.latest())
               timestamp=startTime
               await privateSale.newRound([0,0,1000000000000000,timestamp.add(time.duration.days(2)),timestamp.add(time.duration.days(3)),0,0,day,4,0,2,40,false,true],{from:owner})
          })
        
          it('can not deposit round dont start', async () => {
               await usdt.approve(privateSale.address,500000,{from:Alexander})
               await privateSale.deposit(500000 ,usdt.address,{from:Alexander}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert Round dont start -- Reason given: Round dont start.");
               await usdt.approve(privateSale.address,500000,{from:Alexander})
               await privateSale.deposit(1000000 ,usdt.address,{from:Alexander}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert Round dont start -- Reason given: Round dont start.");
          })

          it('deposit', async () => {
               startTime=startTime.add(time.duration.days(2).add(time.duration.seconds(1)))
               await time.increaseTo(startTime)
               
               let result = await usdt.approve(privateSale.address,500000,{from:Alexander})
               await privateSale.deposit(500000 ,usdt.address,{from:Alexander})
               await usdt.approve(privateSale.address,500000,{from:Dmitry})
               await privateSale.deposit(500000 ,usdt.address,{from:Dmitry})
          })

          it('the second time you cannot make a deposit', async () => {
               await usdt.approve(privateSale.address,500000,{from:Alexander})
               await privateSale.deposit(500000 ,usdt.address,{from:Alexander}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert You  have already made a deposit -- Reason given: You  have already made a deposit.");
          })

          it('can not deposit after end timestamp', async () => {
               startTime=startTime.add(time.duration.days(1))
               await time.increaseTo(startTime)
               
               let result = await usdt.approve(privateSale.address,500000,{from:Victor})
               await privateSale.deposit(500000 ,usdt.address,{from:Victor}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert Round is ended, round time expired -- Reason given: Round is ended, round time expired.");
              
          })

          it('balance expenseAddress before finish',async () => {
               let balance = await (usdt.balanceOf.call(expenseAddress))
               assert.equal((300000).toString(), balance.toString())
               balance = await (usdt.balanceOf.call(logicContract))
               assert.equal((200000).toString(), balance.toString())
          })
          
          it('finish round', async () => {
               await privateSale.finishRound({from:owner})
          })

          it('balance expenseAddress after finish',async () => {
               let balance = await (usdt.balanceOf.call(expenseAddress))
               assert.equal((900000).toString(), balance.toString())
               balance = await (usdt.balanceOf.call(logicContract))
               assert.equal((600000).toString(), balance.toString())
          })
          

          it('claim', async () => {
               result=await privateSale.getVestingAddress(2,{from:Alexander});
               vesting = await TokenVestingGroup.at(result);
          })

          it('balance is zero at first',async () => {
               let balance = await vesting.releasableAmount()
               assert.equal((0).toString(), balance.toString())
               let flag= false;
               try {
               await vesting.claim()
               } catch (error) {
               error.message.should.equal('Returned error: VM Exception while processing transaction: revert TokenVesting: no tokens are due -- Reason given: TokenVesting: no tokens are due.')
               flag=true;
               }
               flag.should.be.true;
               balance = await ( blid.balanceOf.call(Alexander)); 
               assert.equal((25000).toString(), balance.toString())
               
          })
           
          it('after one day the balance is increased by   1 / 4 all deposit',async () => {
               await time.increaseTo(startTime.add(time.duration.days(1)).add(time.duration.seconds(343)))
               await vesting.claim({from:Alexander})
               let balance = await (blid.balanceOf.call(Alexander)) 
               assert.equal((125000000025000).toString(), balance.toString())
          })
          
          it('СSR do not burn',async () => {
               let balance = await (blid.totalSupply.call())
               assert.equal("999999999000000000100000", balance.toString())
          })
    })
});
