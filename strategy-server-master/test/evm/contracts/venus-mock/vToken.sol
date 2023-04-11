//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract vToken is ERC20 {
  address public token;
  using SafeERC20 for IERC20;
  mapping (address => mapping(address => uint256)) borrowed;

  constructor(address _token, string memory name, string memory symbol) ERC20(name, symbol) {
    token = _token;
  }

  function getAccountSnapshot(address account) external view returns (uint, uint, uint, uint) {
    uint256 userBorrowed = borrowed[token][account];
    return (0, 0, userBorrowed, 0);
  }

  function mint(uint256 amount) external returns (uint256) {
    IERC20(token).transferFrom(address(msg.sender), address(this), amount);
    _mint(address(msg.sender), amount);
    return amount;
  }

  function redeemUnderlying(uint256 redeemAmount) external returns (uint256) {
    _burn(address(msg.sender), redeemAmount);
    IERC20(token).transfer(address(msg.sender), redeemAmount);
    return redeemAmount;
  }

  function borrow(uint256 borrowAmount) external returns (uint256) {
    IERC20(token).transfer(address(msg.sender), borrowAmount);
    borrowed[token][address(msg.sender)] = borrowed[token][address(msg.sender)] + borrowAmount;
    return borrowAmount;
  }

  function repayBorrow(uint256 repayAmount) external returns (uint256) {
    IERC20(token).transferFrom(address(msg.sender), address(this), repayAmount);
    borrowed[token][address(msg.sender)] = borrowed[token][address(msg.sender)] - repayAmount;
    return repayAmount;
  }


  function borrowBalanceCurrent(address account) external returns (uint256) {}

  function repayBorrow() external payable {}
  function mint() external payable {}
}
