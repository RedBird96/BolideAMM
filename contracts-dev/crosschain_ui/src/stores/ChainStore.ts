import {makeAutoObservable, observable} from "mobx";
import {ethers} from "ethers";
import {IToken, IChain} from "../interfaces/token";

declare var window: any;

export class ChainStore {
  error: any;

  constructor() {
    makeAutoObservable(this);
    this.error = "";
  }

  getDepositGasFee = async (
    srcChainInfo: IChain,
    dstChainInfo: IChain,
    dstGasForCall: number
  ) => {
    const ContractABI = require("../abi/CrossChainDepositor.json");

    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");

    const contract = new ethers.Contract(
      srcChainInfo.contract,
      ContractABI,
      provider
    );

    try {
      const gasFee = await contract.getDepositFeeStargate(
        dstChainInfo.chainId,
        dstGasForCall
      );
      this.error = "";
      return gasFee;
    } catch (error) {
      this.error = error;
      return 0;
    }
  };

  getTokenBalance = async (tokenInfo: IToken, walletAddress: string) => {
    const ContractABI = require("../abi/erc20.json");

    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");

    const contract = new ethers.Contract(
      tokenInfo.address,
      ContractABI,
      provider
    );

    try {
      const balance = await contract.balanceOf(walletAddress);

      this.error = "";
      return balance;
    } catch (error) {
      this.error = error;
      return 0;
    }
  };

  getETHBalance = async (chainInfo: IChain, walletAddress: string) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");

    try {
      const balance = await provider.getBalance(walletAddress);

      this.error = "";
      return balance;
    } catch (error) {
      this.error = error;
      return 0;
    }
  };

  getAllowance = async (
    chainInfo: IChain,
    tokenInfo: IToken,
    walletAddress: string
  ) => {
    const ContractABI = require("../abi/erc20.json");

    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    const contract = new ethers.Contract(
      tokenInfo.address,
      ContractABI,
      signer
    );

    try {
      const allowance = await contract
        .connect(signer)
        .allowance(walletAddress, chainInfo.contract);

      this.error = "";
      return allowance;
    } catch (error) {
      this.error = error;
    }
  };

  approveToken = async (
    chainInfo: IChain,
    tokenInfo: IToken,
    amount: number
  ) => {
    const ContractABI = require("../abi/erc20.json");

    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    const contract = new ethers.Contract(
      tokenInfo.address,
      ContractABI,
      signer
    );

    try {
      const tx = await contract
        .connect(signer)
        .approve(chainInfo.contract, amount);
      await tx.wait(1);

      this.error = "";
    } catch (error) {
      this.error = error;
    }
  };

  depositCrosschain = async (
    srcChainInfo: IChain,
    dstChainInfo: IChain,
    srcTokenInfo: IToken,
    dstTokenInfo: IToken,
    dstGasForCall: string,
    depositAmount: string,
    amountOutMin: string,
    depositFee: string
  ) => {
    const ContractABI = require("../abi/CrossChainDepositor.json");

    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    const contract = new ethers.Contract(
      srcChainInfo.contract,
      ContractABI,
      provider
    );

    try {
      const tx = await contract
        .connect(signer)
        .depositStarGate(
          dstChainInfo.chainId,
          srcTokenInfo.address,
          dstTokenInfo.address,
          depositAmount,
          amountOutMin,
          dstGasForCall,
          {value: depositFee}
        );

      await tx.wait(1);

      this.error = "";

      return tx.hash;
    } catch (error) {
      this.error = error;
    }
  };

  getTokenOutput = async (
    srcChainInfo: IChain,
    dstChainInfo: IChain,
    srcTokenInfo: IToken,
    dstTokenInfo: IToken,
    fromAddress: string,
    amount: number
  ) => {
    const ContractABI = require("../abi/StargateFeeLibrary.json");

    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();

    const contract = new ethers.Contract(
      srcChainInfo.feeLibrary,
      ContractABI,
      signer
    );

    try {
      const swapAmount = await contract
        .connect(signer)
        .getFees(
          srcTokenInfo.poolId,
          dstTokenInfo.poolId,
          dstChainInfo.chainId,
          fromAddress,
          amount
        );

      /*
      const outputAmount = swapAmount
      .subtract(swapObj.eqFee)
      .subtract(swapObj.protocolFee)
      .subtract(swapObj.lpFee)
      .add(swapObj.eqReward);    
      struct SwapObj {
          uint256 amount;
          uint256 eqFee;
          uint256 eqReward;
          uint256 lpFee;
          uint256 protocolFee;
          uint256 lkbRemove;
      }
      */
      const outputAmount =
        amount -
        parseInt(swapAmount[1].toString()) -
        parseInt(swapAmount[4].toString()) -
        parseInt(swapAmount[3].toString()) +
        parseInt(swapAmount[2].toString());

      return outputAmount.toString();
      this.error = "";
    } catch (error) {
      this.error = error;
    }
  };

  getFeeLibrary = async () => {
    const ContractABI = require("../abi/StargatePool.json");
    var customHttpProvider = new ethers.providers.JsonRpcProvider(
      // "https://rpc-mumbai.maticvigil.com/v1/b2a512be104bc69afe809d2b164a6c689ab0e954"
      // "https://data-seed-prebsc-1-s1.binance.org:8545/"
      "https://api.avax-test.network/ext/bc/C/rpc"
    );
    let wallet = new ethers.Wallet(
      process.env.REACT_APP_PRIVATE_KEY!,
      customHttpProvider
    );

    const contract = new ethers.Contract(
      "0xf14b09e2524855460d3a2cf7e682b8e8b1ba0f35",
      ContractABI,
      wallet
    );

    try {
      const tx = await contract.connect(wallet).feeLibrary();

      console.log(tx);
      this.error = "";
    } catch (error) {
      this.error = error;
    }
  };
}
