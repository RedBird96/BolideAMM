const { contract ,accounts} = require('@openzeppelin/test-environment');
const { time } = require('@openzeppelin/test-helpers');

const [ owner, recipient, recipient2 ] = accounts;

const Bolide = contract.fromArtifact("Bolide");
const TreasuryVester = contract.fromArtifact("TreasuryVester");


require('chai')
  .use(require('chai-as-promised'))
  .should()



describe('Bolide', () => {
    let blid, startTime, treasuryVester
    before(async () => {
        blid = await Bolide.new("1000000000000000000000000",{from: owner})
    })
  
    describe('bad deployment', async () => {
     
        it('vesting can not begin too early', async () => {
            startTime = await time.latest()

            treasuryVester = await TreasuryVester.new(
                blid.address,
                recipient,
                "100000000",
                startTime.sub(time.duration.days(1)),
                startTime,
                startTime.add(time.duration.days(1)),
                {from: owner}
            ).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert TreasuryVester::constructor: vesting begin too early -- Reason given: TreasuryVester::constructor: vesting begin too early.");
            
        })
        
        it('cliff can not is too early', async () => {
            startTime = await time.latest()

            treasuryVester = await TreasuryVester.new(
                blid.address,
                recipient,
                "100000000",
                startTime.add(time.duration.days(1)),
                startTime.add(time.duration.hours(1)),
                startTime.add(time.duration.days(2)),
                {from: owner}
            ).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert TreasuryVester::constructor: cliff is too early -- Reason given: TreasuryVester::constructor: cliff is too early.");
            
        })

        it('end can not is earlier then cliff', async () => {
            startTime = await time.latest()

            treasuryVester = await TreasuryVester.new(
                blid.address,
                recipient,
                "100000000",
                startTime.add(time.duration.days(1)),
                startTime.add(time.duration.days(3)),
                startTime.add(time.duration.days(2)),
                {from: owner}
            ).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert TreasuryVester::constructor: end is too early -- Reason given: TreasuryVester::constructor: end is too early.");
            
        })
     
    })

    describe('standart scene', async () => {

        it('deploy', async () => {
            startTime = await time.latest()

            treasuryVester = await TreasuryVester.new(
                blid.address,
                recipient,
                "1000000",
                startTime.add(time.duration.days(1)),
                startTime.add(time.duration.days(2)),
                startTime.add(time.duration.days(3)),
                {from: owner}
            )
            await blid.mint(
                treasuryVester.address,
                "1000000000000000000000000",
                {from: owner}
            )
        })

        it('only owner can call setRecipient', async () => {
            await treasuryVester.setRecipient(
                owner,
                {from: recipient}
            ).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert TreasuryVester::setRecipient: unauthorized -- Reason given: TreasuryVester::setRecipient: unauthorized");
        })

        it('setRecipient', async () => {
            await treasuryVester.setRecipient(
                recipient2,
                {from: owner}
            ) 
        })

        it('can not claim under cliff', async () => {
            await treasuryVester.claim(
                {from: recipient2}
            ).should.be.revertedWith("Returned error: VM Exception while processing transaction: revert TreasuryVester::claim: not time yet -- Reason given: TreasuryVester::claim: not time yet");
        })

        it('claim first half', async () => {
            await time.increaseTo(startTime.add(time.duration.days(2)))
            treasuryVester.claim(
                {from: recipient2}
            )
            let balance = await blid.balanceOf(recipient2)
            assert.equal(balance.toString(),"500000000000000000000000");
        })

        it('claim second half', async () => {
            await time.increaseTo(startTime.add(time.duration.days(3)))
            treasuryVester.claim(
                {from: recipient2}
            )
            let balance = await blid.balanceOf(recipient2)
            assert.equal(balance.toString(),"1000000000000000000000000");
        })

    })
})
