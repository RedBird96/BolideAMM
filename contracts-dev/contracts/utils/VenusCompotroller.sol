// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

contract VenusCompotroller {
    function enterMarkets(address[] calldata xTokens)
        external
        returns (uint256[] memory)
    {
        uint256[] memory results = new uint256[](1);
        results[0] = 1;

        return results;
    }

    function markets(address cTokenAddress)
        external
        view
        returns (
            bool,
            uint256,
            bool
        )
    {
        return (true, 100, true);
    }
}
