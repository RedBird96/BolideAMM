import React, { useEffect, useState } from "react";
import {
  Form,
  Field,
  FormElement,
  FieldWrapper,
} from "@progress/kendo-react-form";
import { StackLayout } from "@progress/kendo-react-layout";
import {
  Input,
  InputSeparator,
  InputSuffix,
  TextBox,
  InputChangeEvent,
} from "@progress/kendo-react-inputs";
import { Button } from "@progress/kendo-react-buttons";
import { ComboBox, ComboBoxChangeEvent } from "@progress/kendo-react-dropdowns";
import { Label, Error } from "@progress/kendo-react-labels";
import {
  Notification,
  NotificationGroup,
} from "@progress/kendo-react-notification";
import { Slide } from "@progress/kendo-react-animation";
import { Typography } from "@progress/kendo-react-common";

import BigNumber from "bignumber.js";

import LoadingScreen from "./LoadingScreen";
import { IToken, IChain } from "../interfaces/token";
import { useStores } from "../use-stores";
import STARGATE from "../data/stargate.json";
import NETWORK from "../data/network.json";
import { ethers } from "ethers";

interface IError {
  isError: boolean;
  list: {
    eth_balance: boolean;
    token_balance: boolean;
  };
  message: string;
}

declare var window: any;
const hashTransferEvent: string =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const Deposit = () => {
  const { chainStore } = useStores();

  const chainListSrc = [
    { id: "polygon", text: "Polygon" },
    { id: "mumbai", text: "Mumbai" },
    { id: "fuji", text: "Avalanche Fuji Testnet" },
  ];

  const [isLoading, SetIsLoading] = React.useState<boolean>(false);
  const [walletAddress, SetWalletAddress] = React.useState<string>("");
  const [dstGasForCall, SetDstGasForCall] = React.useState<number>(2000000);
  const [dstRpcUrl, SetDstRpcUrl] = React.useState<string>("");
  const [dstStargateRouter, SelDstStargateRouter] = React.useState<string>("");
  const [selSrcChain, setSelSrcChain] = React.useState<IChain>({
    name: "",
    chainId: 0,
    contract: "",
    feeLibrary: "",
    symbol: "",
  });
  const [selDstChain, SetSelDstChain] = React.useState<IChain>({
    name: "",
    chainId: 0,
    contract: "",
    feeLibrary: "",
    symbol: "",
  });
  const [srcTokenList, SetSrcTokenList] = React.useState();
  const [dstTokenList, SetDstTokenList] = React.useState();
  const [selSrcToken, SetSelSrcToken] = React.useState<IToken>({
    name: "",
    address: "",
    pool: "",
    poolId: 0,
  });
  const [selDstToken, SetSelDstToken] = React.useState<IToken>({
    name: "",
    address: "",
    pool: "",
    poolId: 0,
  });
  const [srcTokenBalance, SetSrcTokenBalance] = React.useState<BigNumber>(
    new BigNumber("0")
  );
  const [srcETHBalance, SetSrcETHBlanace] = React.useState<BigNumber>(
    new BigNumber("0")
  );
  const [gasFeeBase, SetGasFeeBase] = React.useState<BigNumber>(
    new BigNumber("0")
  );
  const [gasFee, SetGasFee] = React.useState<BigNumber>(new BigNumber("0"));
  const [depositAmount, SetDepositAmount] = React.useState<string>("0");
  const [outputAmount, SetOutputAmount] = React.useState<string>("0");
  const [amountOutMin, SetAmountOutMin] = React.useState<string>("0");
  const [depositAmountToCrossChain, SetDepositAmountToCrossChain] =
    React.useState<number>(0);
  const [depositAmountToStargate, SetDepositAmountToStargate] =
    React.useState<number>(0);
  const [depositAmountStorage, SetDepositAmountStorage] =
    React.useState<string>("Wait 20 ~ 40 mins");
  const [allowanceAmount, SetAllowanceAmount] = React.useState<number>(0);

  const [error, SetError] = React.useState<IError>({
    isError: false,
    list: {
      eth_balance: false,
      token_balance: false,
    },
    message: "",
  });
  const [chainError, SetChainError] = React.useState<string>("");
  const [success, SetSuccess] = React.useState<boolean>(false);

  // Load Wallet address
  useEffect(() => {
    const funcLoadWallet = async () => {
      SetIsLoading(true);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      SetWalletAddress(accounts[0]);
      SetIsLoading(false);
    };
    funcLoadWallet();
  }, [walletAddress]);

  /* Event Handler */
  const onChainSrcChange = async (event: ComboBoxChangeEvent) => {
    SetIsLoading(true);

    // Set Destination Chain & TokenList
    let srcChain: IChain, dstChain: IChain;

    if (event.target.value.id == "polygon") {
      dstChain = {
        name: STARGATE["bsc"].name,
        chainId: STARGATE["bsc"].chainId,
        contract: process.env.REACT_APP_ACCUMULATED_DEPOSITOR_BSC!,
        feeLibrary: STARGATE["bsc"].feeLibrary,
        symbol: STARGATE["bsc"].symbol,
      };
      SetDstTokenList(JSON.parse(JSON.stringify(STARGATE["bsc"].token)));
      SetDstRpcUrl(STARGATE["bsc"].rpcUrl);
      SelDstStargateRouter(STARGATE["bsc"].StargateRouter);
    } else {
      dstChain = {
        name: STARGATE["bscTestnet"].name,
        chainId: STARGATE["bscTestnet"].chainId,
        contract: process.env.REACT_APP_ACCUMULATED_DEPOSITOR_BSC_TESTNET!,
        feeLibrary: STARGATE["bscTestnet"].feeLibrary,
        symbol: STARGATE["bscTestnet"].symbol,
      };
      SetDstTokenList(JSON.parse(JSON.stringify(STARGATE["bscTestnet"].token)));
      SetDstRpcUrl(STARGATE["bscTestnet"].rpcUrl);
      SelDstStargateRouter(STARGATE["bscTestnet"].StargateRouter);
    }
    SetSelDstChain(dstChain);
    SetSelDstToken({
      name: "",
      address: "",
      pool: "",
      poolId: 0,
    });

    // Set Source Chain & Token List
    // @ts-ignore
    const srcChainRaw = STARGATE[event.target.value.id];
    if (event.target.value.id == "polygon")
      srcChainRaw.contract = process.env.REACT_APP_CROSSCHAIN_DEPOSITOR_POLYGON;
    if (event.target.value.id == "mumbai")
      srcChainRaw.contract = process.env.REACT_APP_CROSSCHAIN_DEPOSITOR_MUMBAI;
    if (event.target.value.id == "fuji")
      srcChainRaw.contract = process.env.REACT_APP_CROSSCHAIN_DEPOSITOR_FUJI;
    srcChain = {
      name: srcChainRaw.name,
      chainId: srcChainRaw.chainId,
      contract: srcChainRaw.contract,
      feeLibrary: srcChainRaw.feeLibrary,
      symbol: srcChainRaw.symbol,
    };

    SetSrcTokenList(JSON.parse(JSON.stringify(srcChainRaw.token)));
    setSelSrcChain(srcChain);
    SetSelSrcToken({
      name: "",
      address: "",
      pool: "",
      poolId: 0,
    });

    // Switch network
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      // @ts-ignore
      params: [NETWORK[event.target.value.id]],
    });

    // Get ETH Balance
    const balance: BigNumber = new BigNumber(
      await (await chainStore.getETHBalance(srcChain, walletAddress)).toString()
    );
    SetChainError(chainStore.error);
    SetSrcETHBlanace(balance);

    // Calculate Gas Gee
    SetDstGasForCall(srcChainRaw.dstGasForCall);

    const gasFeeBase: BigNumber = new BigNumber(
      await (
        await chainStore.getDepositGasFee(srcChain, dstChain, 0)
      ).toString()
    );
    SetChainError(chainStore.error);
    SetGasFeeBase(gasFeeBase);

    const gasFee: BigNumber = new BigNumber(
      await (
        await chainStore.getDepositGasFee(
          srcChain,
          dstChain,
          srcChainRaw.dstGasForCall
        )
      ).toString()
    );
    SetChainError(chainStore.error);
    SetGasFee(gasFee);

    // Clear
    SetDepositAmount("0");
    SetOutputAmount("0");

    // Clear error
    SetError({
      isError: false,
      message: "",
      list: {
        eth_balance: false,
        token_balance: false,
      },
    });

    SetIsLoading(false);
  };

  const onSrcTokenChange = async (event: ComboBoxChangeEvent) => {
    SetIsLoading(true);

    SetSelSrcToken(event.target.value);

    // Get Token Balance
    const balance: BigNumber = new BigNumber(
      await (
        await chainStore.getTokenBalance(event.target.value, walletAddress)
      ).toString()
    );

    SetChainError(chainStore.error);
    SetSrcTokenBalance(balance);
    SetIsLoading(false);
  };

  const onDstTokenChange = async (event: ComboBoxChangeEvent) => {
    SetSelDstToken(event.target.value);
  };

  const onChangeDepositAmount = async (event: InputChangeEvent) => {
    SetDepositAmount(event.value?.toString());
  };

  const onChangeAmountOutMin = async (event: InputChangeEvent) => {
    SetAmountOutMin(event.value?.toString());
  };

  const onEstimate = async (event: any) => {
    SetIsLoading(true);

    // Get estimate
    const outputAmount = (await chainStore.getTokenOutput(
      selSrcChain,
      selDstChain,
      selSrcToken,
      selDstToken,
      walletAddress,
      parseInt(depositAmount)
    )) as string;
    SetChainError(chainStore.error);
    SetOutputAmount(outputAmount);

    // get allowance
    const allowance = await chainStore.getAllowance(
      selSrcChain,
      selSrcToken,
      walletAddress
    );
    SetAllowanceAmount(allowance);

    SetIsLoading(false);
  };

  const onApprove = async (event: any) => {
    SetIsLoading(true);

    // Approve to Crosschain
    await chainStore.approveToken(
      selSrcChain,
      selSrcToken,
      parseInt(depositAmount)
    );
    SetChainError(chainStore.error);

    SetAllowanceAmount(parseInt(depositAmount));
    SetIsLoading(false);
  };

  const onDeposit = async (event: any) => {
    // Check Balance
    if (srcTokenBalance.lt(new BigNumber(depositAmount))) {
      SetError({
        isError: true,
        message:
          "You don't have enough " +
          selSrcToken?.name +
          " balance on " +
          selSrcChain.name +
          ".",
        list: {
          ...error.list,
          token_balance: true,
        },
      });

      return;
    }

    // Check Fee
    if (gasFee.gt(srcETHBalance)) {
      SetError({
        isError: true,
        message:
          "You don't have enough " +
          selSrcChain.symbol +
          " balance on " +
          selSrcChain.name +
          ".",
        list: {
          ...error.list,
          eth_balance: true,
        },
      });

      return;
    }

    // Clear error
    SetError({
      isError: false,
      message: "",
      list: {
        eth_balance: false,
        token_balance: false,
      },
    });

    SetIsLoading(true);

    // Deposit to Crosschain
    const txHash = await chainStore.depositCrosschain(
      selSrcChain,
      selDstChain,
      selSrcToken,
      selDstToken,
      dstGasForCall.toString(),
      depositAmount,
      amountOutMin,
      gasFee.toString()
    );
    SetChainError(chainStore.error);

    // Show Log Information
    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    let pendingTx = await provider.getTransactionReceipt(txHash);

    if (pendingTx) {
      // filter pendingTx.data
      pendingTx.logs
        .filter(
          (element) =>
            element.address.toLowerCase() ==
              selSrcToken.address.toLowerCase() &&
            element.topics[0].toLowerCase() == hashTransferEvent
        )
        .forEach((element) => {
          // Deposit to CrossChainDepositor
          if (
            element.topics[2]
              .toLowerCase()
              .indexOf(selSrcChain.contract.toLowerCase().substring(2)) > 0
          )
            SetDepositAmountToCrossChain(parseInt(element.data));

          // Deposit to Stargate Pool
          if (
            element.topics[2]
              .toLowerCase()
              .indexOf(selSrcToken.pool.toLowerCase().substring(2)) > 0
          )
            SetDepositAmountToStargate(parseInt(element.data));
        });
    }

    if (chainStore.error == "") SetSuccess(true);
    SetIsLoading(false);

    // ** Checking dst chain **/
    var customHttpProvider = new ethers.providers.JsonRpcProvider(dstRpcUrl);
    let wallet = new ethers.Wallet(
      process.env.REACT_APP_PRIVATE_KEY!,
      customHttpProvider
    );

    const AccumulatedDepositorABI = require("../abi/AccumulatedDepositor.json");
    const contractAccumulatedDepositor = new ethers.Contract(
      selDstChain.contract,
      AccumulatedDepositorABI,
      wallet
    );

    contractAccumulatedDepositor.on(
      "ReceivedOnDestination",
      (token, amount, accountAddress) => {
        if (accountAddress == walletAddress) SetDepositAmountStorage(amount);
      }
    );

    const StargateRouterABI = require("../abi/StargateRouter.json");
    const contractStargateRouter = new ethers.Contract(
      dstStargateRouter,
      StargateRouterABI,
      wallet
    );
    contractStargateRouter.on(
      "CachedSwapSaved ",
      (chainId, srcAddress, nonce, token, amountLD, to, payload, reason) => {
        if (to == selDstChain.contract)
          SetDepositAmountStorage("Error on " + selDstChain.name);
      }
    );
  };

  return (
    <div>
      <div className="page-wrapper page-service_provider">
        <StackLayout orientation="vertical" align={{ vertical: "top" }}>
          <div className="box header"></div>
          <StackLayout orientation="horizontal">
            <div className="box nav"></div>
            <div className="box content">
              <Form
                initialValues={{
                  chainSrcList: "Mumbai",
                  chainDstList: "BSC Testnet",
                  enabled: true,
                }}
                render={(formRenderProps) => (
                  <FormElement
                    style={{
                      maxWidth: 650,
                      marginLeft: "auto",
                      marginRight: "auto",
                    }}
                    horizontal={true}
                  >
                    <fieldset className={"k-form-fieldset"}>
                      <legend className={"k-form-legend"}>Source Chain</legend>
                      <div className="row">
                        <div className="col col-6">
                          <FieldWrapper>
                            <Label>Source Chain</Label>
                            <div className={"k-form-field-wrap"}>
                              <Field
                                name={"chainSrcList"}
                                component={ComboBox}
                                data={chainListSrc}
                                textField="text"
                                dataItemKey="id"
                                onChange={onChainSrcChange}
                              />
                              {selSrcChain.name == "" && (
                                <Error id={"firstNameError"}>
                                  This field is required.
                                </Error>
                              )}
                            </div>
                          </FieldWrapper>
                        </div>
                        <div className="col col-6">
                          <FieldWrapper>
                            <Label>Token From</Label>
                            <div className={"k-form-field-wrap"}>
                              <Field
                                name={"srcToken"}
                                component={ComboBox}
                                data={srcTokenList}
                                textField="name"
                                dataItemKey="name"
                                value={selSrcToken}
                                onChange={onSrcTokenChange}
                              />
                              {selSrcToken == null && (
                                <Error id={"firstNameError"}>
                                  This field is required.
                                </Error>
                              )}
                            </div>
                          </FieldWrapper>
                        </div>
                        {selSrcChain.name != "" && selSrcToken.name != "" && (
                          <div className="col col-6">
                            <FieldWrapper>
                              <Label>
                                <Typography.p
                                  themeColor={
                                    error.list.token_balance
                                      ? "error"
                                      : "inherit"
                                  }
                                >
                                  Balance of&nbsp;
                                  {selSrcToken?.name}
                                </Typography.p>
                              </Label>
                              <div className={"k-form-field-wrap txt-showonly"}>
                                <TextBox
                                  value={srcTokenBalance?.toString()}
                                  name={"srcTokenBalance"}
                                  suffix={() => (
                                    <>
                                      <InputSeparator />
                                      <InputSuffix>
                                        <Button
                                          disabled={false}
                                          themeColor="primary"
                                          fillMode={"flat"}
                                          rounded={null}
                                        >
                                          Wei
                                        </Button>
                                      </InputSuffix>
                                    </>
                                  )}
                                />
                              </div>
                            </FieldWrapper>
                          </div>
                        )}
                      </div>
                    </fieldset>
                    <fieldset className={"k-form-fieldset"}>
                      <legend className={"k-form-legend"}>
                        Destination Chain
                      </legend>
                      <div className="row">
                        <div className="col col-6">
                          <FieldWrapper>
                            <Label>Destination Chain</Label>
                            <div className={"k-form-field-wrap"}>
                              <Input
                                type={"text"}
                                value={selDstChain?.name}
                                disabled={true}
                              />
                            </div>
                          </FieldWrapper>
                        </div>
                        <div className="col col-6">
                          <FieldWrapper>
                            <Label>Token To</Label>
                            <div className={"k-form-field-wrap"}>
                              <Field
                                name={"dstToken"}
                                component={ComboBox}
                                data={dstTokenList}
                                textField="name"
                                dataItemKey="name"
                                onChange={onDstTokenChange}
                              />
                              {selDstToken == null && (
                                <Error id={"firstNameError"}>
                                  This field is required.
                                </Error>
                              )}
                            </div>
                          </FieldWrapper>
                        </div>
                      </div>
                    </fieldset>
                    <fieldset className={"k-form-fieldset deposit-estimation"}>
                      <legend className={"k-form-legend"}>Information</legend>
                      <div className="row">
                        <div className="col col-6">
                          <FieldWrapper>
                            <Label>Your wallet address</Label>
                            <div className={"k-form-field-wrap txt-showonly"}>
                              <TextBox
                                value={walletAddress.toString()}
                                name={"walletAddress"}
                              />
                            </div>
                          </FieldWrapper>
                        </div>
                        {selSrcChain.name != "" && (
                          <div className="col col-6">
                            <FieldWrapper>
                              <Label>Required Gas on {selDstChain?.name}</Label>
                              <div className={"k-form-field-wrap txt-showonly"}>
                                <TextBox
                                  value={dstGasForCall.toString()}
                                  name={"dstGasForCall"}
                                  suffix={() => (
                                    <>
                                      <InputSeparator />
                                      <InputSuffix>
                                        <Button
                                          disabled={false}
                                          themeColor="primary"
                                          fillMode={"flat"}
                                          rounded={null}
                                        >
                                          Wei
                                        </Button>
                                      </InputSuffix>
                                    </>
                                  )}
                                />
                              </div>
                            </FieldWrapper>
                          </div>
                        )}
                        {selSrcChain.name != "" && (
                          <div className="col col-6">
                            <FieldWrapper>
                              <Label>
                                <Typography.p
                                  themeColor={
                                    error.list.eth_balance ? "error" : "inherit"
                                  }
                                >
                                  Required {selSrcChain?.symbol} on&nbsp;
                                  {selSrcChain?.name} for Stargate LayerZero
                                </Typography.p>
                              </Label>
                              <div className={"k-form-field-wrap txt-showonly"}>
                                <TextBox
                                  value={gasFeeBase?.toString()}
                                  name={"gasFeeBase"}
                                  suffix={() => (
                                    <>
                                      <InputSeparator />
                                      <InputSuffix>
                                        <Button
                                          disabled={false}
                                          themeColor="primary"
                                          fillMode={"flat"}
                                          rounded={null}
                                        >
                                          Wei
                                        </Button>
                                      </InputSuffix>
                                    </>
                                  )}
                                />
                              </div>
                            </FieldWrapper>
                          </div>
                        )}
                        {selSrcChain.name != "" && (
                          <div className="col col-6">
                            <FieldWrapper>
                              <Label>
                                <Typography.p
                                  themeColor={
                                    error.list.eth_balance ? "error" : "inherit"
                                  }
                                >
                                  Required {selSrcChain?.symbol} on&nbsp;
                                  {selSrcChain?.name} for {selDstChain?.name}
                                </Typography.p>
                              </Label>
                              <div className={"k-form-field-wrap txt-showonly"}>
                                <TextBox
                                  value={gasFee.minus(gasFeeBase)?.toString()}
                                  name={"gasFeeDst"}
                                  suffix={() => (
                                    <>
                                      <InputSeparator />
                                      <InputSuffix>
                                        <Button
                                          disabled={false}
                                          themeColor="primary"
                                          fillMode={"flat"}
                                          rounded={null}
                                        >
                                          Wei
                                        </Button>
                                      </InputSuffix>
                                    </>
                                  )}
                                />
                              </div>
                            </FieldWrapper>
                          </div>
                        )}
                        {selSrcChain.name != "" && (
                          <div className="col col-6">
                            <FieldWrapper>
                              <Label>
                                <Typography.p
                                  themeColor={
                                    error.list.eth_balance ? "error" : "inherit"
                                  }
                                >
                                  Required {selSrcChain?.symbol} on&nbsp;
                                  {selSrcChain?.name} finally
                                </Typography.p>
                              </Label>
                              <div className={"k-form-field-wrap txt-showonly"}>
                                <TextBox
                                  value={gasFee?.toString()}
                                  name={"gasFeeDst"}
                                  suffix={() => (
                                    <>
                                      <InputSeparator />
                                      <InputSuffix>
                                        <Button
                                          disabled={false}
                                          themeColor="primary"
                                          fillMode={"flat"}
                                          rounded={null}
                                        >
                                          Wei
                                        </Button>
                                      </InputSuffix>
                                    </>
                                  )}
                                />
                              </div>
                            </FieldWrapper>
                          </div>
                        )}
                        {selSrcChain.name != "" && (
                          <div className="col col-6">
                            <FieldWrapper>
                              <Label>
                                <Typography.p
                                  themeColor={
                                    error.list.eth_balance ? "error" : "inherit"
                                  }
                                >
                                  Your {selSrcChain?.symbol} balance of on{" "}
                                  {selSrcChain?.name}
                                </Typography.p>
                              </Label>
                              <div className={"k-form-field-wrap txt-showonly"}>
                                <TextBox
                                  value={srcETHBalance?.toString()}
                                  name={"srcETHBalance"}
                                  suffix={() => (
                                    <>
                                      <InputSeparator />
                                      <InputSuffix>
                                        <Button
                                          disabled={false}
                                          themeColor="primary"
                                          fillMode={"flat"}
                                          rounded={null}
                                        >
                                          Wei
                                        </Button>
                                      </InputSuffix>
                                    </>
                                  )}
                                />
                              </div>
                            </FieldWrapper>
                          </div>
                        )}
                      </div>

                      {selSrcChain.name != "" &&
                        selSrcToken.name != "" &&
                        selDstToken.name != "" && (
                          <div className="row">
                            <div className={"k-form-separator"} />
                            <div className="col col-6">
                              <FieldWrapper>
                                <Label>
                                  <Typography.p
                                    themeColor={
                                      error.list.token_balance
                                        ? "error"
                                        : "inherit"
                                    }
                                  >
                                    {selSrcToken?.name} amount to deposit on{" "}
                                    {selSrcChain.name}
                                  </Typography.p>
                                </Label>
                                <div className={"k-form-field-wrap"}>
                                  <Input
                                    type={"number"}
                                    name="depositAmount"
                                    onChange={onChangeDepositAmount}
                                    value={depositAmount}
                                  />
                                  {(!depositAmount || depositAmount == "0") && (
                                    <Error id={"firstNameError"}>
                                      This field is required.
                                    </Error>
                                  )}
                                </div>
                              </FieldWrapper>
                            </div>
                            <div className="k-form-buttons">
                              <Button
                                themeColor={"primary"}
                                disabled={
                                  chainError != "" ||
                                  !depositAmount ||
                                  depositAmount == "0"
                                }
                                onClick={onEstimate}
                              >
                                Estimate
                              </Button>
                            </div>
                          </div>
                        )}
                    </fieldset>

                    {selDstChain.name != "" && outputAmount != "0" && (
                      <fieldset
                        className={"k-form-fieldset deposit-estimation"}
                      >
                        <legend className={"k-form-legend"}>
                          Estimation on {selDstChain.name}
                        </legend>
                        <div className="row">
                          <div className="col col-6">
                            <FieldWrapper>
                              <Label>
                                Estimated &nbsp;
                                {selDstToken.name} on {selDstChain.name}
                              </Label>
                              <div className={"k-form-field-wrap txt-showonly"}>
                                <TextBox
                                  value={outputAmount}
                                  name={"tokenFee"}
                                  suffix={() => (
                                    <>
                                      <InputSeparator />
                                      <InputSuffix>
                                        <Button
                                          disabled={false}
                                          themeColor="primary"
                                          fillMode={"flat"}
                                          rounded={null}
                                        >
                                          Wei
                                        </Button>
                                      </InputSuffix>
                                    </>
                                  )}
                                />
                              </div>
                            </FieldWrapper>
                          </div>
                          <div className="col col-6">
                            <FieldWrapper>
                              <Label>
                                Minimum amout of {selSrcToken?.name} to out
                                on&nbsp;
                                {selDstChain.name}
                              </Label>
                              <div className={"k-form-field-wrap"}>
                                <Input
                                  type={"number"}
                                  name="amountOutMin"
                                  onChange={onChangeAmountOutMin}
                                  value={amountOutMin}
                                />
                                {(!amountOutMin || amountOutMin == "0") && (
                                  <Error id={"firstNameError"}>
                                    This field is required.
                                  </Error>
                                )}
                              </div>
                            </FieldWrapper>
                          </div>
                          <div className={"k-form-separator"} />
                          <div className="col col-6">
                            <FieldWrapper>
                              <Label>
                                Allowance of&nbsp;
                                {selSrcToken.name} for Crosschain Depositor
                              </Label>
                              <div className={"k-form-field-wrap txt-showonly"}>
                                <TextBox
                                  value={allowanceAmount}
                                  name={"allowanceAmount"}
                                  suffix={() => (
                                    <>
                                      <InputSeparator />
                                      <InputSuffix>
                                        <Button
                                          disabled={false}
                                          themeColor="primary"
                                          fillMode={"flat"}
                                          rounded={null}
                                        >
                                          Wei
                                        </Button>
                                      </InputSuffix>
                                    </>
                                  )}
                                />
                              </div>
                            </FieldWrapper>
                          </div>
                          <div className="k-form-buttons">
                            <Button
                              themeColor={"primary"}
                              disabled={
                                depositAmount == "0" ||
                                parseInt(depositAmount) <= allowanceAmount
                              }
                              onClick={onApprove}
                            >
                              Approve
                            </Button>
                          </div>
                          <div className={"k-form-separator"} />
                          <div className="k-form-buttons">
                            <Button
                              themeColor={"primary"}
                              disabled={
                                depositAmount == "0" ||
                                amountOutMin == "0" ||
                                chainError != ""
                              }
                              onClick={onDeposit}
                            >
                              Deposit
                            </Button>
                          </div>
                        </div>
                      </fieldset>
                    )}

                    {success && (
                      <fieldset
                        className={"k-form-fieldset deposit-estimation"}
                      >
                        <legend className={"k-form-legend"}>Status</legend>
                        <div className="row">
                          <div className="col col-6">
                            <FieldWrapper>
                              <Label>
                                Deposit &nbsp;
                                {selSrcToken.name} to CrossChainDepositor
                              </Label>
                              <div className={"k-form-field-wrap txt-showonly"}>
                                <TextBox
                                  value={depositAmountToCrossChain}
                                  name={"depositAmountToCrossChain"}
                                  suffix={() => (
                                    <>
                                      <InputSeparator />
                                      <InputSuffix>
                                        <Button
                                          disabled={false}
                                          themeColor="primary"
                                          fillMode={"flat"}
                                          rounded={null}
                                        >
                                          Wei
                                        </Button>
                                      </InputSuffix>
                                    </>
                                  )}
                                />
                              </div>
                            </FieldWrapper>
                          </div>
                          <div className="col col-6">
                            <FieldWrapper>
                              <Label>
                                Deposit &nbsp;
                                {selSrcToken.name} to Stargate
                              </Label>
                              <div className={"k-form-field-wrap txt-showonly"}>
                                <TextBox
                                  value={depositAmountToStargate}
                                  name={"depositAmountToStargate"}
                                  suffix={() => (
                                    <>
                                      <InputSeparator />
                                      <InputSuffix>
                                        <Button
                                          disabled={false}
                                          themeColor="primary"
                                          fillMode={"flat"}
                                          rounded={null}
                                        >
                                          Wei
                                        </Button>
                                      </InputSuffix>
                                    </>
                                  )}
                                />
                              </div>
                            </FieldWrapper>
                          </div>
                          <div className="col col-6">
                            <FieldWrapper>
                              <Label>
                                Deposit &nbsp;
                                {selDstToken.name} to Storage
                              </Label>
                              <div className={"k-form-field-wrap txt-showonly"}>
                                <TextBox
                                  value={depositAmountStorage}
                                  name={"depositAmountStorage"}
                                  suffix={() => (
                                    <>
                                      <InputSeparator />
                                      <InputSuffix>
                                        <Button
                                          disabled={false}
                                          themeColor="primary"
                                          fillMode={"flat"}
                                          rounded={null}
                                        >
                                          Wei
                                        </Button>
                                      </InputSuffix>
                                    </>
                                  )}
                                />
                              </div>
                            </FieldWrapper>
                          </div>
                        </div>
                      </fieldset>
                    )}
                  </FormElement>
                )}
              />
            </div>
            <div className="box toc">
              {chainError != "" && (
                <fieldset className={"k-form-fieldset chain-error"}>
                  <legend className={"k-form-legend"}>Blockchain Error</legend>
                  <div className="row">{chainError.toString()}</div>
                </fieldset>
              )}
            </div>
          </StackLayout>
          <div className="box footer"></div>
        </StackLayout>
      </div>
      {isLoading && <LoadingScreen />}
      <NotificationGroup
        style={{
          top: 10,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <Slide direction={error.isError ? "down" : "up"}>
          {error.isError && (
            <Notification
              type={{
                style: "error",
                icon: true,
              }}
              closable={true}
              onClose={() => SetError({ ...error, isError: false })}
            >
              <span>{error.message}</span>
            </Notification>
          )}
        </Slide>
        <Slide direction={success ? "down" : "up"}>
          {success && (
            <Notification
              type={{
                style: "success",
                icon: true,
              }}
              closable={true}
              onClose={() => SetSuccess(false)}
            >
              <span>
                Deposit {depositAmount}(wei) of {selSrcToken.name} on{" "}
                {selSrcChain.name} to {selDstChain.name} as {selDstToken.name}{" "}
                has been completed !
              </span>
            </Notification>
          )}
        </Slide>
      </NotificationGroup>
    </div>
  );
};
export default Deposit;
