// SPDX-License-Identifier: MIT

pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

interface LogicContract {
    function returnToken(uint256 amount, address token) external;
}

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);

    function latestAnswer() external view returns (int256 answer);
}

contract StorageV0 is Initializable, OwnableUpgradeable, PausableUpgradeable {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    //structs
    struct DepositStruct {
        mapping(address => uint256) amount;
        mapping(address => int256) tokenTime;
        uint256 iterate;
        uint256 balanceBLID;
        mapping(address => uint256) depositIterate;
    }

    struct EarnBLID {
        uint256 allBLID;
        uint256 timestamp;
        uint256 usd;
        uint256 tdt;
        mapping(address => uint256) rates;
    }

    //events
    event Deposit(address depositor, address token, uint256 amount);
    event Withdraw(address depositor, address token, uint256 amount);
    event UpdateTokenBalance(uint256 balance, address token);
    event TakeToken(address token, uint256 amount);
    event ReturnToken(address token, uint256 amount);
    event AddEarn(uint256 amount);
    event UpdateBLIDBalance(uint256 balance);
    event InterestFee(address depositor, uint256 amount);
    event SetBLID(address blid);
    event AddToken(address token, address oracle);
    event SetLogic(address logic);

    function initialize(address _logicContract) external initializer {
        OwnableUpgradeable.__Ownable_init();
        PausableUpgradeable.__Pausable_init();
        logicContract = _logicContract;
    }

    //variable
    mapping(uint256 => EarnBLID) private earnBLID;
    uint256 private countEarns;
    uint256 private countTokens;
    mapping(uint256 => address) private tokens;
    mapping(address => uint256) private tokenBalance;
    mapping(address => address) private oracles;
    mapping(address => bool) private tokensAdd;
    mapping(address => DepositStruct) private deposits;
    mapping(address => uint256) private tokenDeposited;
    mapping(address => int256) private tokenTime;
    uint256 private reserveBLID;
    address private logicContract;
    address private BLID;

    //modifiers
    modifier isUsedToken(address _token) {
        require(tokensAdd[_token], "E1");
        _;
    }

    modifier isLogicContract(address account) {
        require(logicContract == account, "E2");
        _;
    }

    //user function
    function deposit(uint256 amount, address token) external isUsedToken(token) whenNotPaused {
        require(amount > 0, "E3");
        uint8 decimals = AggregatorV3Interface(token).decimals();
        IERC20Upgradeable(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 amountExp18 = amount * 10**(18 - decimals);
        if (deposits[msg.sender].tokenTime[address(0)] == 0) {
            deposits[msg.sender].iterate = countEarns;
            deposits[msg.sender].depositIterate[token] = countEarns;
            deposits[msg.sender].amount[token] += amountExp18;
            deposits[msg.sender].tokenTime[address(0)] = 1;
            deposits[msg.sender].tokenTime[token] += int256(block.timestamp * (amountExp18));
        } else {
            interestFee();
            if (deposits[msg.sender].depositIterate[token] == countEarns) {
                deposits[msg.sender].tokenTime[token] += int256(block.timestamp * (amountExp18));
                deposits[msg.sender].amount[token] += amountExp18;
            } else {
                deposits[msg.sender].tokenTime[token] = int256(
                    deposits[msg.sender].amount[token] *
                        earnBLID[countEarns - 1].timestamp +
                        block.timestamp *
                        (amountExp18)
                );
                deposits[msg.sender].amount[token] += amountExp18;
                deposits[msg.sender].depositIterate[token] = countEarns;
            }
        }

        tokenTime[token] += int256(block.timestamp * (amountExp18));
        tokenBalance[token] += amountExp18;
        tokenDeposited[token] += amountExp18;

        emit UpdateTokenBalance(tokenBalance[token], token);
        emit Deposit(msg.sender, token, amountExp18);
    }

    function withdraw(uint256 amount, address token) external isUsedToken(token) whenNotPaused {
        uint8 decimals = AggregatorV3Interface(token).decimals();
        uint256 countEarns_ = countEarns;
        uint256 amountExp18 = amount * 10**(18 - decimals);
        require(deposits[msg.sender].amount[token] >= amountExp18 && amount > 0, "E4");
        if (amountExp18 > tokenBalance[token]) {
            LogicContract(logicContract).returnToken(amount, token);
            interestFee();
            IERC20Upgradeable(token).safeTransferFrom(logicContract, msg.sender, amount);
            tokenDeposited[token] -= amountExp18;
            tokenTime[token] -= int256(block.timestamp * (amountExp18));

            emit UpdateTokenBalance(tokenBalance[token], token);
            emit Withdraw(msg.sender, token, amountExp18);
        } else {
            interestFee();
            IERC20Upgradeable(token).safeTransfer(msg.sender, amount);
            tokenTime[token] -= int256(block.timestamp * (amountExp18));

            tokenBalance[token] -= amountExp18;
            tokenDeposited[token] -= amountExp18;
            emit UpdateTokenBalance(tokenBalance[token], token);
            emit Withdraw(msg.sender, token, amountExp18);
        }
        if (deposits[msg.sender].depositIterate[token] == countEarns_) {
            deposits[msg.sender].tokenTime[token] -= int256(block.timestamp * (amountExp18));
            deposits[msg.sender].amount[token] -= amountExp18;
        } else {
            deposits[msg.sender].tokenTime[token] =
                int256(deposits[msg.sender].amount[token] * earnBLID[countEarns_ - 1].timestamp) -
                int256(block.timestamp * (amountExp18));
            deposits[msg.sender].amount[token] -= amountExp18;
            deposits[msg.sender].depositIterate[token] = countEarns_;
        }
    }

    function interestFee() public {
        uint256 balanceUser = balanceEarnBLID(msg.sender);
        require(reserveBLID >= balanceUser, "E5");
        IERC20Upgradeable(BLID).safeTransfer(msg.sender, balanceUser);
        deposits[msg.sender].balanceBLID = balanceUser;
        deposits[msg.sender].iterate = countEarns;
        unchecked {
            deposits[msg.sender].balanceBLID = 0;
            reserveBLID -= balanceUser;
        }
        emit UpdateBLIDBalance(reserveBLID);
        emit InterestFee(msg.sender, balanceUser);
    }

    //owner functions
    function setBLID(address _blid) external onlyOwner {
        BLID = _blid;
        emit SetBLID(_blid);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function addToken(address _token, address _oracles) external onlyOwner {
        require(_token != address(0) && _oracles != address(0));
        require(!tokensAdd[_token], "E6");
        oracles[_token] = _oracles;
        tokens[countTokens++] = _token;
        tokensAdd[_token] = true;
        emit AddToken(_token, _oracles);
    }

    function setLogic(address _logic) external onlyOwner {
        logicContract = _logic;
        emit SetLogic(_logic);
    }

    // logicContract functions

    function takeToken(uint256 amount, address token) external isLogicContract(msg.sender) isUsedToken(token) {
        uint8 decimals = AggregatorV3Interface(token).decimals();
        IERC20Upgradeable(token).safeTransfer(msg.sender, amount);
        tokenBalance[token] = tokenBalance[token] - (amount * 10**(18 - decimals));
        emit UpdateTokenBalance(tokenBalance[token], token);
        emit TakeToken(token, amount * 10**(18 - decimals));
    }

    function returnToken(uint256 amount, address token) external isLogicContract(msg.sender) isUsedToken(token) {
        uint8 decimals = AggregatorV3Interface(token).decimals();
        IERC20Upgradeable(token).safeTransferFrom(logicContract, address(this), amount);
        tokenBalance[token] = tokenBalance[token] + (amount * 10**(18 - decimals));

        emit UpdateTokenBalance(tokenBalance[token], token);
        emit ReturnToken(token, amount * 10**(18 - decimals));
    }

    function addEarn(uint256 amount) external isLogicContract(msg.sender) {
        IERC20Upgradeable(BLID).safeTransferFrom(msg.sender, address(this), amount);
        reserveBLID += amount;
        int256 _dollarTime = 0;
        uint256 countTokens_ = countTokens;
        uint256 countEarns_ = countEarns;
        for (uint256 i = 0; i < countTokens_; i++) {
            earnBLID[countEarns_].rates[tokens[i]] = (uint256(
                AggregatorV3Interface(oracles[tokens[i]]).latestAnswer()
            ) * 10**(18 - AggregatorV3Interface(oracles[tokens[i]]).decimals()));

            earnBLID[countEarns_].usd += tokenDeposited[tokens[i]] * earnBLID[countEarns_].rates[tokens[i]]; // count all deposited token in usd

            _dollarTime += tokenTime[tokens[i]] * int256(earnBLID[countEarns_].rates[tokens[i]]); // convert token time to dollar time
        }
        require(_dollarTime != 0);
        earnBLID[countEarns_].allBLID = amount;
        earnBLID[countEarns_].timestamp = block.timestamp;
        earnBLID[countEarns_].tdt = uint256(
            (int256(((block.timestamp) * earnBLID[countEarns_].usd)) - _dollarTime) / (1 ether)
        ); // count delta of current token time and all user token time

        for (uint256 i = 0; i < countTokens_; i++) {
            tokenTime[tokens[i]] = int256(tokenDeposited[tokens[i]] * block.timestamp); // count curent token time
        }
        earnBLID[countEarns_].usd /= (1 ether);
        countEarns++;

        emit AddEarn(amount);
        emit UpdateBLIDBalance(reserveBLID);
    }

    // external function
    function _upBalance(address account) external {
        deposits[account].balanceBLID = balanceEarnBLID(account);
        deposits[account].iterate = countEarns;
    }

    function _upBalanceByItarate(address account, uint256 iterate) external {
        uint userIterate = deposits[account].iterate;
        uint sum = 0;
        require(countEarns - userIterate >= iterate, "E7");
        uint256 countTokens_ = countTokens;
        for (uint256 i = userIterate; i < iterate + userIterate; i++) {
            for (uint256 j = 0; j < countTokens_; j++) {
                //if iterate when youser deposited
                if (i == deposits[account].depositIterate[tokens[j]]) {
                    sum +=
                        (earnBLID[i].allBLID *
                            uint256(
                                (int256( // all distibution BLID multiply to
                                    (deposits[account].amount[tokens[j]] * earnBLID[i].rates[tokens[j]]) *
                                        earnBLID[i].timestamp
                                ) - (deposits[account].tokenTime[tokens[j]] * int256(earnBLID[i].rates[tokens[j]]))) // delta of  user dollar time and user dollar time if user deposited in at the beginning distibution
                            )) /
                        earnBLID[i].tdt /
                        (1 ether); //div to delta of all users dollar time and all users dollar time if all users deposited in at the beginning distibution
                } else {
                    sum +=
                        (earnBLID[i].allBLID * // all distibution BLID multiply to
                            (earnBLID[i].timestamp - earnBLID[i - 1].timestamp) * //duration of distribution time
                            ((deposits[account].amount[tokens[j]] * earnBLID[i].rates[tokens[j]]) / (1 ether))) / // convert from token to usd
                        earnBLID[i].tdt; //div to delta of all users dollar time and all users dollar time if all users deposited in at the beginning distibution
                }
            }
        }
        deposits[account].balanceBLID += sum;
        deposits[account].iterate += iterate;
    }

    function balanceEarnBLID(address account) public view returns (uint256) {
        if (deposits[account].tokenTime[address(0)] == 0 || countEarns == 0) {
            return 0;
        }
        uint256 countTokens_ = countTokens;
        uint256 countEarns_ = countEarns;

        uint256 sum = 0;
        for (uint256 i = deposits[account].iterate; i < countEarns_; i++) {
            for (uint256 j = 0; j < countTokens_; j++) {
                //if iterate when youser deposited
                if (i == deposits[account].depositIterate[tokens[j]]) {
                    sum +=
                        (earnBLID[i].allBLID *
                            uint256(
                                (int256( // all distibution BLID multiply to
                                    (deposits[account].amount[tokens[j]] * earnBLID[i].rates[tokens[j]]) *
                                        earnBLID[i].timestamp
                                ) - (deposits[account].tokenTime[tokens[j]] * int256(earnBLID[i].rates[tokens[j]]))) // delta of  user dollar time and user dollar time if user deposited in at the beginning distibution
                            )) /
                        earnBLID[i].tdt /
                        (1 ether); //div to delta of all users dollar time and all users dollar time if all users deposited in at the beginning distibution
                } else {
                    sum +=
                        (earnBLID[i].allBLID * // all distibution BLID multiply to
                            (earnBLID[i].timestamp - earnBLID[i - 1].timestamp) * //duration of distribution time
                            ((deposits[account].amount[tokens[j]] * earnBLID[i].rates[tokens[j]]) / (1 ether))) / // convert from token to usd
                        earnBLID[i].tdt; //div to delta of all users dollar time and all users dollar time if all users deposited in at the beginning distibution
                }
            }
        }
        return sum + deposits[account].balanceBLID;
    }

    function balanceOf(address account) external view returns (uint256) {
        uint256 countTokens_ = countTokens;
        uint256 sum = 0;
        for (uint256 j = 0; j < countTokens_; j++) {
            sum += ((deposits[account].amount[tokens[j]] *
                uint256(AggregatorV3Interface(oracles[tokens[j]]).latestAnswer()) *
                10**(18 - AggregatorV3Interface(oracles[tokens[j]]).decimals())) / (1 ether));
        }
        return sum;
    }

    function getBLIDReserve() external view returns (uint256) {
        return reserveBLID;
    }

    function getTotalDeposit() external view returns (uint256) {
        uint256 countTokens_ = countTokens;
        uint256 sum = 0;
        for (uint256 j = 0; j < countTokens_; j++) {
            sum +=
                (tokenDeposited[tokens[j]] *
                    uint256(AggregatorV3Interface(oracles[tokens[j]]).latestAnswer()) *
                    10**(18 - AggregatorV3Interface(oracles[tokens[j]]).decimals())) /
                (1 ether);
        }
        return sum;
    }

    function getTokenBalance(address token) external view returns (uint256) {
        return tokenBalance[token];
    }

    function getTokenDeposit(address account, address token) external view returns (uint256) {
        return deposits[account].amount[token];
    }

    function _isUsedToken(address _token) external view returns (bool) {
        return tokensAdd[_token];
    }

    function getCountEarns() external view returns (uint256) {
        return countEarns;
    }

    function getEarnsByID(uint256 id)
        external
        view
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        return (earnBLID[id].allBLID, earnBLID[id].timestamp, earnBLID[id].usd);
    }

    function getTokenDeposited(address token) external view returns (uint256) {
        return tokenDeposited[token];
    }
}
