// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;
pragma abicoder v2;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "./utils/LogicUpgradeable.sol";
import "./Interfaces/IXToken.sol";
import "./Interfaces/ICompoundVenus.sol";
import "hardhat/console.sol";

contract StrategyHelper is LogicUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    struct vTokenInfo {
        string baseName;
        address vTokenAddress;
        uint256 borrowBalance;
        uint256 vTokenBalance;
    }

    address private venusComp;
    address private venusOracle;

    event SetVenusAddress(address venusComp, address venusOracle);

    function __StrategyHelper_init(
    ) public initializer {
        LogicUpgradeable.initialize();
    }

    /*** User function ***/

    /**
     * @notice Set MultiLogicProxy, you can call the function once
     * @param _venusComp Address of Venus Comptroller
     * @param _venusComp Address of Venus Oracle
     */
    function setVenusAddress(address _venusComp, address _venusOracle) 
        external 
        onlyOwnerAndAdmin
    {
        venusComp = _venusComp;
        venusOracle = _venusOracle;

        emit SetVenusAddress(venusComp, venusOracle);
    }

    /**
     * @notice get strategy available balance from venus
     * @param _logic Address of Venus Comptroller
     * @param _tokens Address of Venus Oracle
     */
    function getStrategyBalance(address _logic, address[] calldata _tokens) 
        external 
        onlyOwnerAndAdmin 
        returns (uint256, uint256, uint256, uint256, vTokenInfo[] memory)
    {
        uint256 sumSupplyUSD;
        uint256 sumBorrowUSD;
        uint256 totalBorrowLimit;
        uint256 percentLimit;
        vTokenInfo[] memory resTokens;

        (sumSupplyUSD, sumBorrowUSD, totalBorrowLimit, resTokens) = _getVTokensBalance(_logic, _tokens);

        if (totalBorrowLimit != 0) {
            percentLimit = sumBorrowUSD * 10000 / totalBorrowLimit;
        }

        return (totalBorrowLimit, sumSupplyUSD, sumBorrowUSD, percentLimit, resTokens);
    }

    /**
     * @notice get strategy available balance from venus
     * @param _vToken Address of Venus Token
     * @param _logic Address of logic
     * @param _toUSD convert usd flag
     */    
    function getBalanceVTokenUSD(address _vToken, address _logic, bool _toUSD) 
        private 
        returns (uint256, uint256) 
    {
        uint256 vTokenBalance;
        uint256 exchangeRateMantissa;
        uint256 balanceVal;
        uint256 borrowBalance;
        uint256 tokenPrice = getVTokenPrice(_vToken);
        uint256 decimal = getBaseTokenDecimal(_vToken);
        (, vTokenBalance, borrowBalance, exchangeRateMantissa) = IXToken(_vToken)
                .getAccountSnapshot(_logic);
        balanceVal = vTokenBalance * exchangeRateMantissa / 10**decimal;
        if (_toUSD) {
            balanceVal *= tokenPrice;
            borrowBalance *= tokenPrice;
        }
        return (balanceVal, borrowBalance);
    }


    /**
     * @notice get strategy available balance from venus
     * @param _vToken Address of Venus Token
     * @param _logic Address of logic   
     */    
    function getBorrowLimitUSD(
        address _vToken, 
        address _logic
    )
        private 
        returns (uint256) 
    {
        uint256 borrowLimit;
        bool isUsedVToken;
        uint256 collateralFactorMantissa;
        uint256 supplying;
        uint256 tokenPrice = getVTokenPrice(_vToken);
        (isUsedVToken, collateralFactorMantissa, ) = 
            IComptrollerVenus(venusComp).markets(_vToken);            
        require(isUsedVToken, "SH2");
        (supplying, ) = getBalanceVTokenUSD(_vToken, _logic, true);
        borrowLimit = supplying * collateralFactorMantissa;
        return borrowLimit;
    }    

    /**
     * @notice get vToken price
     * @param _vToken Address of Venus Token
     */   
    function getVTokenPrice(address _vToken) private returns(uint256){
        require(venusOracle != address(0), "SH3");
        uint256 tokenPrice = IVenusPriceOracle(venusOracle).getUnderlyingPrice(_vToken);
        return tokenPrice;
    }

    /**
     * @notice get base token decimal
     * @param _vToken Address of Venus Token
     */   
    function getBaseTokenDecimal(address _vToken) private view returns(uint256) {
        address baseAddress = IXToken(_vToken).underlying();
        uint256 decimal = XToken(baseAddress).decimals();
        return decimal;
    }

    /**
     * @notice get base token name
     * @param _vToken Address of Venus Token
     */   
    function getBaseTokenName(address _vToken) private view returns(string memory) {
        address baseAddress = IXToken(_vToken).underlying();
        string memory name = XToken(baseAddress).symbol();
        return name;
    }

    /**
     * @notice get total supply, borrow, borrowlimit in usd amount
     * @param _logic Address of Logic
     * @param _tokens Venus Tokens
     */ 

    function _getVTokensBalance(address _logic, address[] calldata _tokens)
        internal
        returns(
            uint256 sumSupplyUSD, 
            uint256 sumBorrowUSD, 
            uint256 totalBorrowLimit, 
            vTokenInfo[] memory resTokens
        )
    {
        uint256 count = _tokens.length;        
        uint256 supplyUSD;
        uint256 borrowBalanceUSD;

        resTokens = new vTokenInfo[](count);

        for(uint256 i = 0; i < count;) {
            
            address vToken = _tokens[i];

            (supplyUSD, borrowBalanceUSD) = getBalanceVTokenUSD(vToken, _logic, true);

            sumSupplyUSD += supplyUSD;
            sumBorrowUSD += borrowBalanceUSD;
            totalBorrowLimit += getBorrowLimitUSD(vToken, _logic);

            uint256 borrowBalance;
            uint256 vTokenBalance;
            (vTokenBalance, borrowBalance) = getBalanceVTokenUSD(vToken, _logic, false);

            resTokens[i] = vTokenInfo(
                getBaseTokenName(vToken),
                vToken,
                borrowBalance,
                vTokenBalance
            );
            
            unchecked {
                ++i;
            }            
        }
        return (sumSupplyUSD, sumBorrowUSD, totalBorrowLimit, resTokens);
    }
}
