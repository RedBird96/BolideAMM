//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

contract vController {
  function enterMarkets(address[] calldata vTokens) external returns (uint256[] memory) {}
  function markets(address vTokenAddress) external view returns (bool, uint256, bool) {}
  function claimVenus(address holder, address[] memory vTokens) external {}
}
