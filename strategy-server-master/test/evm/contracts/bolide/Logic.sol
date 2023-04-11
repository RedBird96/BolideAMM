// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;
pragma abicoder v2;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IStorage {
    function takeToken(uint256 amount, address token) external;

    function returnToken(uint256 amount, address token) external;

    function addEarn(uint256 amount) external;
}

interface IDistribution {
    function enterMarkets(address[] calldata vTokens) external returns (uint256[] memory);

    function markets(address vTokenAddress)
        external
        view
        returns (
            bool,
            uint256,
            bool
        );

    // Claim all the XVS accrued by holder in all markets
    function claimVenus(address holder) external;

    function claimVenus(address holder, address[] memory vTokens) external;
}

interface IMasterChef {
    function poolInfo(uint256 _pid)
        external
        view
        returns (
            address lpToken,
            uint256 allocPoint,
            uint256 lastRewardBlock,
            uint256 accCakePerShare
        );

    function deposit(uint256 _pid, uint256 _amount) external;

    function withdraw(uint256 _pid, uint256 _amount) external;

    function enterStaking(uint256 _amount) external;

    // Withdraw BANANA tokens from STAKING.
    function leaveStaking(uint256 _amount) external;

    // Withdraw without caring about rewards. EMERGENCY ONLY.
    function emergencyWithdraw(uint256 _pid) external;

    function userInfo(uint256 _pid, address account) external view returns (uint256, uint256);
}

interface IVToken {
    function mint(uint256 mintAmount) external returns (uint256);

    function borrow(uint256 borrowAmount) external returns (uint256);

    function mint() external payable;

    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);

    function repayBorrow(uint256 repayAmount) external returns (uint256);

    function borrowBalanceCurrent(address account) external returns (uint256);

    function repayBorrow() external payable;
}

interface IPancakePair {
    function token0() external view returns (address);

    function token1() external view returns (address);
}

interface IPancakeRouter01 {
    function WETH() external pure returns (address);

    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts);

    function getAmountsIn(uint256 amountOut, address[] calldata path) external view returns (uint256[] memory amounts);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        );

    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        external
        payable
        returns (
            uint256 amountToken,
            uint256 amountETH,
            uint256 liquidity
        );

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountA, uint256 amountB);

    function removeLiquidityETH(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external returns (uint256 amountToken, uint256 amountETH);

    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 amountA, uint256 amountB);

    function removeLiquidityETHWithPermit(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 amountToken, uint256 amountETH);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);

    function swapTokensForExactETH(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);

    function swapETHForExactTokens(
        uint256 amountOut,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory amounts);
}

interface IBurnable {
    function burn(uint256 amount) external;

    function burnFrom(address account, uint256 amount) external;
}

contract Logic is Ownable, Multicall {
    using SafeERC20 for IERC20;

    struct ReserveLiquidity {
        address tokenA;
        address tokenB;
        address vTokenA;
        address vTokenB;
        address swap;
        address swapMaster;
        address lpToken;
        uint256 poolID;
        address[][] path;
    }

    fallback() external payable {}

    receive() external payable {}

    modifier onlyOwnerAndAdmin() {
        require(msg.sender == owner() || msg.sender == admin, "E1");
        _;
    }

    modifier onlyStorage() {
        require(msg.sender == _storage, "E1");
        _;
    }

    modifier isUsedVToken(address vToken) {
        require(usedVTokens[vToken], "E2");
        _;
    }

    modifier isUsedSwap(address swap) {
        require(swap == apeswap || swap == pancake, "E3");
        _;
    }

    modifier isUsedMaster(address swap) {
        require(swap == pancakeMaster || apeswapMaster == swap, "E4");
        _;
    }

    address private _storage;
    address private blid;
    address private admin;
    address private venusController;
    address private pancake;
    address private apeswap;
    address private pancakeMaster;
    address private apeswapMaster;
    address private expenseAddress;
    address private vBNB;
    mapping(address => bool) private usedVTokens;
    mapping(address => address) private VTokens;

    ReserveLiquidity[] reserves;

    event SetAdmin(address admin);

    function getReservesCount() external view returns (uint256) {
        return reserves.length;
    }

    function getReserve(uint256 id) external view returns (ReserveLiquidity memory) {
        return reserves[id];
    }

    constructor(
        address _expenseAddress,
        address _venusController,
        address pancakeRouter,
        address apeswapRouter,
        address pancakeMaster_,
        address apeswapMaster_
    ) {
        expenseAddress = _expenseAddress;
        venusController = _venusController;

        apeswap = apeswapRouter;
        pancake = pancakeRouter;
        pancakeMaster = pancakeMaster_;
        apeswapMaster = apeswapMaster_;
    }

    // @mocked evm-test
    function addVTokensTestMock(address token, address vToken) external onlyOwner {
        if ((token) != address(0)) {
            IERC20(token).approve(vToken, type(uint256).max);
            VTokens[token] = vToken;
        } else {
            vBNB = vToken;
        }
        usedVTokens[vToken] = true;
    }

    function addVTokens(address token, address vToken) external onlyOwner {
        bool _isUsedVToken;
        (_isUsedVToken, , ) = IDistribution(venusController).markets(vToken);
        require(_isUsedVToken, "E5");
        if ((token) != address(0)) {
            IERC20(token).approve(vToken, type(uint256).max);
            IERC20(token).approve(apeswap, type(uint256).max);
            IERC20(token).approve(pancake, type(uint256).max);
            IERC20(token).approve(_storage, type(uint256).max);
            IERC20(token).approve(pancakeMaster, type(uint256).max);
            IERC20(token).approve(apeswapMaster, type(uint256).max);
            VTokens[token] = vToken;
        } else {
            vBNB = vToken;
        }
        usedVTokens[vToken] = true;
    }

    function setBLID(address blid_) external onlyOwner {
        require(blid == address(0), "E6");
        blid = blid_;
        IERC20(blid).safeApprove(apeswap, type(uint256).max);
        IERC20(blid).safeApprove(pancake, type(uint256).max);
        IERC20(blid).safeApprove(pancakeMaster, type(uint256).max);
        IERC20(blid).safeApprove(apeswapMaster, type(uint256).max);
        IERC20(blid).safeApprove(_storage, type(uint256).max);
    }

    function setStorage(address storage_) external onlyOwner {
        require(_storage == address(0), "storage was set");
        _storage = storage_;
    }

    function getPriceFromLpToToken(
        address lpToken,
        uint256 value,
        address token,
        address swap,
        address[] memory path
    ) internal view returns (uint256) {
        //make price returned not affected by slippage rate
        uint256 totalSupply = IERC20(lpToken).totalSupply();
        address token0 = IPancakePair(lpToken).token0();
        uint256 totalTokenAmount = IERC20(token0).balanceOf(lpToken) * (2);
        uint256 amountIn = (value * totalTokenAmount) / (totalSupply);

        if (amountIn == 0 || token0 == token) {
            return amountIn;
        }

        uint256[] memory price = IPancakeRouter01(swap).getAmountsOut(amountIn, path);
        return price[price.length - 1];
    }

    function getPriceFromTokenToLp(
        address lpToken,
        uint256 value,
        address token,
        address swap,
        address[] memory path
    ) internal view returns (uint256) {
        //make price returned not affected by slippage rate
        uint256 totalSupply = IERC20(lpToken).totalSupply();
        address token0 = IPancakePair(lpToken).token0();
        uint256 totalTokenAmount = IERC20(token0).balanceOf(lpToken);

        if (token0 == token) {
            return (value * (totalSupply)) / (totalTokenAmount) / 2;
        }

        uint256[] memory price = IPancakeRouter01(swap).getAmountsOut((1 gwei), path);
        return (value * (totalSupply)) / ((price[price.length - 1] * 2 * totalTokenAmount) / (1 gwei));
    }

    function findPath(uint256 id, address token) internal view returns (address[] memory path) {
        uint256 length = reserves[id].path.length;

        for (uint256 i = 0; i < length; i++) {
            if (reserves[id].path[i][reserves[id].path[i].length - 1] == token) {
                return reserves[id].path[i];
            }
        }
    }

    function approveTokenForSwap(address token) external onlyOwner {
        (IERC20(token).approve(apeswap, type(uint256).max));
        (IERC20(token).approve(pancake, type(uint256).max));
        (IERC20(token).approve(pancakeMaster, type(uint256).max));
        (IERC20(token).approve(apeswapMaster, type(uint256).max));
    }

    function repayBorrowBNBandToken(
        address swap,
        address tokenB,
        address VTokenA,
        address VTokenB,
        uint lpAmount
    ) private {
        (uint256 amountToken, uint256 amountETH) = IPancakeRouter01(swap).removeLiquidityETH(
            tokenB,
            lpAmount,
            0,
            0,
            address(this),
            block.timestamp + 1 days
        );
        {
            uint256 totalBorrow = IVToken(VTokenA).borrowBalanceCurrent(address(this));
            if (totalBorrow >= amountETH) {
                IVToken(VTokenA).repayBorrow{ value: amountETH }();
            } else {
                IVToken(VTokenA).repayBorrow{ value: totalBorrow }();
            }

            totalBorrow = IVToken(VTokenB).borrowBalanceCurrent(address(this));
            if (totalBorrow >= amountToken) {
                IVToken(VTokenB).repayBorrow(amountToken);
            } else {
                IVToken(VTokenB).repayBorrow(totalBorrow);
            }
        }
    }

    function repayBorrowOnlyTokens(
        address swap,
        address tokenA,
        address tokenB,
        address VTokenA,
        address VTokenB,
        uint lpAmount
    ) private {
        (uint256 amountA, uint256 amountB) = IPancakeRouter01(swap).removeLiquidity(
            tokenA,
            tokenB,
            lpAmount,
            0,
            0,
            address(this),
            block.timestamp + 1 days
        );
        {
            uint256 totalBorrow = IVToken(VTokenA).borrowBalanceCurrent(address(this));
            if (totalBorrow >= amountA) {
                IVToken(VTokenA).repayBorrow(amountA);
            } else {
                IVToken(VTokenA).repayBorrow(totalBorrow);
            }

            totalBorrow = IVToken(VTokenB).borrowBalanceCurrent(address(this));
            if (totalBorrow >= amountB) {
                IVToken(VTokenB).repayBorrow(amountB);
            } else {
                IVToken(VTokenB).repayBorrow(totalBorrow);
            }
        }
    }

    function withdrawAndRepay(ReserveLiquidity memory reserve, uint256 lpAmount) private {
        IMasterChef(reserve.swapMaster).withdraw(reserve.poolID, lpAmount);
        if (reserve.tokenA == address(0) || reserve.tokenB == address(0)) {
            //if tokenA is BNB
            if (reserve.tokenA == address(0)) {
                repayBorrowBNBandToken(reserve.swap, reserve.tokenB, reserve.vTokenA, reserve.vTokenB, lpAmount);
            }
            //if tokenB is BNB
            else {
                repayBorrowBNBandToken(reserve.swap, reserve.tokenA, reserve.vTokenB, reserve.vTokenA, lpAmount);
            }
        }
        //if token A and B is not BNB
        else {
            repayBorrowOnlyTokens(
                reserve.swap,
                reserve.tokenA,
                reserve.tokenB,
                reserve.vTokenA,
                reserve.vTokenB,
                lpAmount
            );
        }
    }

    function returnToken(uint256 amount, address token) external payable onlyStorage {
        uint256 takeFromVenus = 0;
        uint256 length = reserves.length;
        //check logic balance
        if (IERC20(token).balanceOf(address(this)) >= amount) {
            return;
        }
        //loop by reserves lp token
        for (uint256 i = 0; i < length; i++) {
            address[] memory path = findPath(i, token); // get path for router
            ReserveLiquidity memory reserve = reserves[i];
            uint256 lpAmount = getPriceFromTokenToLp(
                reserve.lpToken,
                amount - takeFromVenus,
                token,
                reserve.swap,
                path
            ); //get amount of lp token that need for reedem liqudity

            (uint256 depositedLp, ) = IMasterChef(reserve.swapMaster).userInfo(reserve.poolID, address(this)); //get how many deposited to farming
            if (depositedLp == 0) continue;
            // if deposited LP tokens don't enough  for repay borrow and for reedem token then only repay borow and continue loop, else repay borow, reedem token and break loop
            if (lpAmount >= depositedLp) {
                takeFromVenus += getPriceFromLpToToken(reserve.lpToken, depositedLp, token, reserve.swap, path);
                withdrawAndRepay(reserve, depositedLp);
            } else {
                withdrawAndRepay(reserve, lpAmount);

                // get supplied token and break loop
                IVToken(VTokens[token]).redeemUnderlying(amount);
                return;
            }
        }
        //try get supplied token
        IVToken(VTokens[token]).redeemUnderlying(amount);
        //if get money
        if (IERC20(token).balanceOf(address(this)) >= amount) {
            return;
        }
        revert("no money");
    }

    function setAdmin(address newAdmin) external onlyOwner {
        admin = newAdmin;
        emit SetAdmin(newAdmin);
    }

    function takeTokenFromStorage(uint256 amount, address token) external onlyOwnerAndAdmin {
        IStorage(_storage).takeToken(amount, token);
    }

    function returnTokenToStorage(uint256 amount, address token) external onlyOwnerAndAdmin {
        IStorage(_storage).returnToken(amount, token);
    }

    function addEarnToStorage(uint256 amount) external onlyOwnerAndAdmin {
        IERC20(blid).safeTransfer(expenseAddress, (amount * 3) / 100);
        IStorage(_storage).addEarn((amount * 97) / 100);
    }

    function enterMarkets(address[] calldata vTokens) external onlyOwnerAndAdmin returns (uint256[] memory) {
        return IDistribution(venusController).enterMarkets(vTokens);
    }

    function claimVenus(address[] calldata vTokens) external onlyOwnerAndAdmin {
        IDistribution(venusController).claimVenus(address(this), vTokens);
    }

    function mint(address vToken, uint256 mintAmount)
        external
        isUsedVToken(vToken)
        onlyOwnerAndAdmin
        returns (uint256)
    {
        return IVToken(vToken).mint(mintAmount);
    }

    function borrow(address vToken, uint256 borrowAmount)
        external
        payable
        isUsedVToken(vToken)
        onlyOwnerAndAdmin
        returns (uint256)
    {
        return IVToken(vToken).borrow(borrowAmount);
    }

    function repayBorrow(address vToken, uint256 repayAmount)
        external
        isUsedVToken(vToken)
        onlyOwnerAndAdmin
        returns (uint256)
    {
        if (vToken == vBNB) {
            IVToken(vToken).repayBorrow{ value: repayAmount }();
            return 0;
        }
        return IVToken(vToken).repayBorrow(repayAmount);
    }

    function redeemUnderlying(address vToken, uint256 redeemAmount)
        external
        isUsedVToken(vToken)
        onlyOwnerAndAdmin
        returns (uint256)
    {
        return IVToken(vToken).redeemUnderlying(redeemAmount);
    }

    function addLiquidity(
        address swap,
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        uint256 deadline
    )
        external
        isUsedSwap(swap)
        returns (
            uint256 amountA,
            uint256 amountB,
            uint256 liquidity
        )
    {
        (amountADesired, amountBDesired, amountAMin) = IPancakeRouter01(swap).addLiquidity(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin,
            address(this),
            deadline
        );

        return (amountADesired, amountBDesired, amountAMin);
    }

    function removeLiquidity(
        address swap,
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        uint256 deadline
    ) external isUsedSwap(swap) returns (uint256 amountA, uint256 amountB) {
        (amountAMin, amountBMin) = IPancakeRouter01(swap).removeLiquidity(
            tokenA,
            tokenB,
            liquidity,
            amountAMin,
            amountBMin,
            address(this),
            deadline
        );

        return (amountAMin, amountBMin);
    }

    function swapExactTokensForTokens(
        address swap,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external isUsedSwap(swap) returns (uint256[] memory amounts) {
        return IPancakeRouter01(swap).swapExactTokensForTokens(amountIn, amountOutMin, path, address(this), deadline);
    }

    function swapTokensForExactTokens(
        address swap,
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        uint256 deadline
    ) external isUsedSwap(swap) returns (uint256[] memory amounts) {
        return IPancakeRouter01(swap).swapTokensForExactTokens(amountOut, amountInMax, path, address(this), deadline);
    }

    function addLiquidityETH(
        address swap,
        address token,
        uint256 amountTokenDesired,
        uint256 amountETHDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        uint256 deadline
    )
        external
        isUsedSwap(swap)
        onlyOwnerAndAdmin
        returns (
            uint256 amountToken,
            uint256 amountETH,
            uint256 liquidity
        )
    {
        (amountETHDesired, amountTokenMin, amountETHMin) = IPancakeRouter01(swap).addLiquidityETH{
            value: amountETHDesired
        }(token, amountTokenDesired, amountTokenMin, amountETHMin, address(this), deadline);

        return (amountETHDesired, amountTokenMin, amountETHMin);
    }

    function removeLiquidityETH(
        address swap,
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        uint256 deadline
    ) external payable isUsedSwap(swap) onlyOwnerAndAdmin returns (uint256 amountToken, uint256 amountETH) {
        (deadline, amountETHMin) = IPancakeRouter01(swap).removeLiquidityETH(
            token,
            liquidity,
            amountTokenMin,
            amountETHMin,
            address(this),
            deadline
        );

        return (deadline, amountETHMin);
    }

    function swapExactETHForTokens(
        address swap,
        uint256 amountETH,
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external isUsedSwap(swap) onlyOwnerAndAdmin returns (uint256[] memory amounts) {
        return
            IPancakeRouter01(swap).swapExactETHForTokens{ value: amountETH }(
                amountOutMin,
                path,
                address(this),
                deadline
            );
    }

    function swapTokensForExactETH(
        address swap,
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        uint256 deadline
    ) external payable isUsedSwap(swap) onlyOwnerAndAdmin returns (uint256[] memory amounts) {
        return IPancakeRouter01(swap).swapTokensForExactETH(amountOut, amountInMax, path, address(this), deadline);
    }

    function swapExactTokensForETH(
        address swap,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        uint256 deadline
    ) external payable isUsedSwap(swap) onlyOwnerAndAdmin returns (uint256[] memory amounts) {
        return IPancakeRouter01(swap).swapExactTokensForETH(amountIn, amountOutMin, path, address(this), deadline);
    }

    function swapETHForExactTokens(
        address swap,
        uint256 amountETH,
        uint256 amountOut,
        address[] calldata path,
        uint256 deadline
    ) external isUsedSwap(swap) onlyOwnerAndAdmin returns (uint256[] memory amounts) {
        return
            IPancakeRouter01(swap).swapETHForExactTokens{ value: amountETH }(amountOut, path, address(this), deadline);
    }

    function deposit(
        address swapMaster,
        uint256 _pid,
        uint256 _amount
    ) external isUsedMaster(swapMaster) onlyOwnerAndAdmin {
        IMasterChef(swapMaster).deposit(_pid, _amount);
    }

    function withdraw(
        address swapMaster,
        uint256 _pid,
        uint256 _amount
    ) external isUsedMaster(swapMaster) onlyOwnerAndAdmin {
        IMasterChef(swapMaster).withdraw(_pid, _amount);
    }

    function enterStaking(address swapMaster, uint256 _amount) external isUsedMaster(swapMaster) onlyOwnerAndAdmin {
        IMasterChef(swapMaster).enterStaking(_amount);
    }

    // Withdraw BANANA tokens from STAKING.
    function leaveStaking(address swapMaster, uint256 _amount) external isUsedMaster(swapMaster) onlyOwnerAndAdmin {
        IMasterChef(swapMaster).leaveStaking(_amount);
    }

    function addReserveLiquidity(ReserveLiquidity memory reserveLiquidity) external onlyOwnerAndAdmin {
        reserves.push(reserveLiquidity);
    }

    function deleteLastReserveLiquidity() external onlyOwnerAndAdmin {
        reserves.pop();
    }
}
