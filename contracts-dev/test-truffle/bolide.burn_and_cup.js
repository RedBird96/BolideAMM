const { contract ,accounts} = require('@openzeppelin/test-environment');
const { time } = require('@openzeppelin/test-helpers');
const [ owner ] = accounts;

const Bolide = contract.fromArtifact("Bolide");
const TokenVesting = contract.fromArtifact("TokenVesting");

require('chai')
  .use(require('chai-as-promised'))
  .should()


const day=60*60*24;

describe('Bolide', () => {
  let blid
  before(async () => {
    blid = await Bolide.new("1000000000000000000000000",{from: owner})
  })

  describe('deployment', async () => {
   
    it('deploys successfully', async () => {
      const address = await blid.address
      assert.notEqual(address, 0x0)
      assert.notEqual(address, '')
      assert.notEqual(address, null)
      assert.notEqual(address, undefined)
    })

    it('has a name', async () => {
      const name = await blid.name()
      assert.equal(name, 'Bolide')
    })
    it('has a symbol', async () => {
      const name = await blid.symbol()
      assert.equal(name, 'BLID')
    })
    it('cap equal 1000000000000000000000000', async () => {
        let cap = await  blid.cap.call(); 
        assert.equal("1000000000000000000000000", cap.toString())
    })
    
    
  })

  describe('mint, transfer , burn', async () => {

    it('non-owner cannot mint ',async () => {
      await blid.mint(accounts[1],365*5*20,{from:accounts[1]}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.");
    })

    it('cannot mint mor cap',async () => {
      await blid.mint(accounts[1],"2000000000000000000000000",{from:accounts[1]}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert Ownable: caller is not the owner -- Reason given: Ownable: caller is not the owner.");
    })

    it('owner can mint more cap',async () => {
      result = await blid.mint(accounts[1],365*5*20,{from:owner})
      let balance = await (blid.balanceOf.call(accounts[1])); 
      assert.equal((365*5*20).toString(), balance.toString())
    })

    it('cannot transfer more than the balance',async () => {
      await blid.transfer(accounts[0],10000000000,{from:accounts[1]}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert ERC20: transfer amount exceeds balance -- Reason given: ERC20: transfer amount exceeds balance.");
    })
    it('transfer',async () => {
     const result= await (blid.transfer(accounts[0],10,{from:accounts[1]}))
      balance = await blid.balanceOf(accounts[1]);
      assert.equal((36490).toString(), balance.toString())
      balance = await blid.balanceOf(accounts[0]);
      assert.equal((10).toString(), balance.toString())
    })
    it('cannot burn more than the balance',async () => { 
      await blid.burn(10000000000000,{from:accounts[1]}).should.be.rejected;
    })
    it('burn',async () => { 
      let result = await (blid.burn(10,{from:accounts[1]}))
      balance = await blid.balanceOf(accounts[1]);
      assert.equal((36480).toString(), balance.toString())
    })
    it('approve',async () => { 
      let result = await blid.approve(accounts[1],10,{from:accounts[0]})
      balance = await blid.allowance(accounts[0],accounts[1]);
      assert.equal((10).toString(), balance.toString())
    })

    it('transferFrom exeption',async () => { 
       await blid.transferFrom(accounts[1],accounts[0],10,{from:accounts[1]}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert ERC20: transfer amount exceeds allowance -- Reason given: ERC20: transfer amount exceeds allowance.");
       await blid.transferFrom(accounts[0],accounts[1],20,{from:accounts[1]}).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert ERC20: transfer amount exceeds balance -- Reason given: ERC20: transfer amount exceeds balance.");
    })


    it('transferFrom',async () => {  
      let result = await blid.transferFrom(accounts[0],accounts[1],10,{from:accounts[1]})
      balance = await blid.balanceOf(accounts[1]);
      assert.equal((36490).toString(), balance.toString())
    })


    
    
})
});
