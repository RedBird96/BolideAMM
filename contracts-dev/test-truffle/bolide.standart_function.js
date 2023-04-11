const suite = require('erc20-test-suite');
const Bolide = artifacts.require('Bolide');
 
contract('Bolide', function (accounts) {
    let options = {
        // accounts to test with, accounts[0] being the contract owner
        accounts: accounts,
 
        // factory method to create new token contract
        create: async function () {
            return await Bolide.new("1000000000000000000000000");
        },
 
        // factory callbacks to mint the tokens
        // use "transfer" instead of "mint" for non-mintable tokens
        mint: async function (token, to, amount) {
            return await token.mint(to, amount, { from: accounts[0] });
        },
 
       
 
        // token info to test
        name: 'Bolide',
        symbol: 'BLID',
        decimals: 18,
 
      
    };
 
    suite(options);
});