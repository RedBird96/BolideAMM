import {useEffect, useState} from 'react'
import type { NextPage } from 'next'
import { Input, Button, List, Typography } from "antd"
import Safe, {SafeFactory, SafeAccountConfig } from '@gnosis.pm/safe-core-sdk'
import SafeServiceClient from '@gnosis.pm/safe-service-client'
import { SafeTransactionDataPartial } from '@gnosis.pm/safe-core-sdk-types'
import {
  getTransactionQueue,
  getTransactionDetails, 
  TransactionListItemType,
} from '@gnosis.pm/safe-react-gateway-sdk'
import EthersAdapter from '@gnosis.pm/safe-ethers-lib'
import { ethers, Contract } from 'ethers'
import styles from '../styles/Home.module.css'
import { Web3Button, Web3Address} from '../components/'
import {routerABI} from '../utils/PancakeRouterABI'
import {Erc20Abi} from '../utils/ERC20ABI'
import {TxTransaction} from '../utils/type'
import {EncodeTransaction} from '../utils/EncodeTransactionsTx'
import { MultiSendCallABI } from '../utils/MultiSendCallABI'
import { useWeb3 } from '../hooks/'


const Home: NextPage = () => {

  const SERVICE_URL = "https://safe-transaction.bsc.gnosis.io";

  const transferAmount = 1000000;
  const swapAmount = 1000000;
  const USDT_ADDRESS = process.env.NEXT_PUBLIC_USDT_ADDRESS!;
  const BLID_ADDRESS = process.env.NEXT_PUBLIC_BLID_ADDRESS!;
  const PANCAKE_ROUTER_ADDRESS = process.env.NEXT_PUBLIC_PANCAKE_ROUTER_ADDRESS!;
  const MULTISENDER_ADDRESS = process.env.NEXT_PUBLIC_MULTISENDER_ADDRESS!;
  const { signer } = useWeb3()
  const [owners, setOwners] = useState<string[]>();
  const [destination, setDestination] = useState("");
  const [gnosisContract, setGnosisContract] = useState<string>("0x15E8704d0633D28aCF70E3e31f8c518B99F20d17");
  const [safe, SetSafe] = useState<Safe>();

  useEffect(() => {
      const interval = setInterval(async () => {
        if (!safe)
          return;
        const ownerTemp = await safe.getOwners();
        setOwners(ownerTemp);  
      }, 1000);
      return () => interval && clearInterval(interval);
  }, [gnosisContract, safe]);

  const CreateContract = async () => {
    if (!signer)
      return;

    const ethAdapter = new EthersAdapter({ ethers, signer })
    const safeFactory = await SafeFactory.create({ ethAdapter })
    const owners = [(await signer.getAddress())];
    const threshold = 1;
    const safeAccountConfig: SafeAccountConfig = {
      owners,
      threshold,
    }
    const safeSdk: Safe = await safeFactory.deploySafe({ safeAccountConfig })
    SetSafe(safeSdk);
    setGnosisContract(safeSdk.getAddress());

  }

  const TransferBLID = async() => {
    if (!signer || !safe)
      return;

    const ethAdapter = new EthersAdapter({ ethers, signer })
    const safeService = new SafeServiceClient({txServiceUrl: SERVICE_URL, ethAdapter});
    const erc20Interface = new ethers.utils.Interface(Erc20Abi);
    const txData = erc20Interface.encodeFunctionData('transfer', [
      destination,
      transferAmount,
    ]);
    const allTransactions = await safeService.getMultisigTransactions(safe.getAddress());
    const num = allTransactions.count === 0 ? 1 : allTransactions.results[0].nonce + 1;
    const transaction: SafeTransactionDataPartial = {
      to: BLID_ADDRESS,
      data: txData,
      value: '0',
      operation: 0, // Optional
      safeTxGas: 0, // Optional
      baseGas: 0, // Optional
      gasPrice: 0, // Optional
      gasToken: '0x0000000000000000000000000000000000000000', // Optional
      refundReceiver: '0x0000000000000000000000000000000000000000', // Optional
      nonce: num, // Optional
    };
    
    const safeTransaction = await safe.createTransaction({safeTransactionData:transaction});
    const safeTransactionHash = await safe.getTransactionHash(safeTransaction)
    const safeTxHash = await safe.signTransactionHash(safeTransactionHash);
    const result = await safeService.proposeTransaction({
      safeAddress: safe.getAddress(),
      safeTransactionData: safeTransaction.data,
      safeTxHash: safeTransactionHash,
      senderAddress: (await signer.getAddress()),
      senderSignature: safeTxHash.data,
    });
  }

  const ExecuteBatch = async() => {
    if (!safe || !signer)
      return;

    const chainId = await signer.getChainId();
    const queueTransaction = await getTransactionQueue(chainId.toString(), safe.getAddress());
    const txTransaction  : TxTransaction[] = [];

    for (const element of queueTransaction.results) {
      if (element.type == TransactionListItemType.TRANSACTION) {
        const details = await getTransactionDetails(chainId.toString(), element.transaction.id);
          txTransaction.push({
            ...element.transaction,
            txDetails: details
          });
        }
    }

    const version = await safe.getContractVersion();
    const account = await signer.getAddress();

    const transaction_data = EncodeTransaction(
      txTransaction, 
      safe.getAddress(), 
      version.toString(), 
      account,
      chainId.toString()
    );
    const instance = new Contract(MULTISENDER_ADDRESS, MultiSendCallABI);
    const gaslimit = await instance.connect(signer).estimateGas.multiSend(transaction_data);
    const result = await instance.connect(signer).multiSend(transaction_data, {gasLimit:gaslimit});
  }
  
  const ApproveToken = async(tokenAddress : string, amount : number) => {
    if (!safe)
      return;
    const moduleInterface = new ethers.utils.Interface(Erc20Abi);
    const data = moduleInterface.encodeFunctionData(
      "approve",[ 
        PANCAKE_ROUTER_ADDRESS,
      amount]
    );

    const transaction: SafeTransactionDataPartial = {
      to: tokenAddress,
      data: data,
      value: '0',
      operation: 0, // Optional
      safeTxGas: 0, // Optional
      baseGas: 0, // Optional
      gasPrice: 0, // Optional
      gasToken: '0x0000000000000000000000000000000000000000', // Optional
      refundReceiver: '0x0000000000000000000000000000000000000000', // Optional
      // nonce: Number(nonce), // Optional
    };

    const safeTransaction = await safe.createTransaction({safeTransactionData:transaction});
    const owern1Signature = await safe.signTransaction(safeTransaction);
    const result = await safe.executeTransaction(owern1Signature);
  }

  const SwapFunction = async(start: string, end: string) => {

    if (!signer || !safe)
      return;
        
    const path = [
      start,
      end,
    ];
    const amountIn = swapAmount;
    const amountOut = swapAmount;

    const deadline = `0x${(
      Math.floor(new Date().getTime() / 1000) + 1000
    ).toString(16)}`;

    const ethAdapter = new EthersAdapter({ ethers, signer })
    const safeService = new SafeServiceClient({txServiceUrl: SERVICE_URL, ethAdapter});    
    const safeAddress = safe.getAddress();

    const moduleInterface = new ethers.utils.Interface(routerABI);

    const data = moduleInterface.encodeFunctionData(
      "swapTokensForExactTokens",[ 
      amountIn,
      amountOut,
      path,
      safeAddress,
      deadline]
    );
    
    const allTransactions = await safeService.getMultisigTransactions(safe.getAddress());
    const num = allTransactions.count === 0 ? 1 : allTransactions.results[0].nonce + 1;    
    const transaction: SafeTransactionDataPartial = {
      to: PANCAKE_ROUTER_ADDRESS,
      data: data,
      value: '0',
      operation: 0, // Optional
      safeTxGas: 0, // Optional
      baseGas: 0, // Optional
      gasPrice: 0, // Optional
      gasToken: '0x0000000000000000000000000000000000000000', // Optional
      refundReceiver: '0x0000000000000000000000000000000000000000', // Optional
      nonce: num, // Optional
    };

    const safeTransaction = await safe.createTransaction({safeTransactionData:transaction});
    const safeTransactionHash = await safe.getTransactionHash(safeTransaction)
    const safeTxHash = await safe.signTransactionHash(safeTransactionHash);
    const result = await safeService.proposeTransaction({
      safeAddress: safe.getAddress(),
      safeTransactionData: safeTransaction.data,
      safeTxHash: safeTransactionHash,
      senderAddress: (await signer.getAddress()),
      senderSignature: safeTxHash.data,
    });
  }

  const SwapUSDTtoBLID = async () => {
    SwapFunction(USDT_ADDRESS, BLID_ADDRESS);
  }

  const SwapBLIDtoUSDT = async () => {
    SwapFunction(BLID_ADDRESS, USDT_ADDRESS);
  }

  const AddOwner = async () => {
    const addOwner = (document.getElementById("owner") as HTMLInputElement);
    if (!safe || addOwner.value.length == 0)
      return;
    
    const tx = await safe.createAddOwnerTx({ownerAddress: addOwner.value , threshold:1});
    await safe.executeTransaction(tx);
  }

  const RemoveOwner = async  () => {
    const addOwner = (document.getElementById("owner") as HTMLInputElement);

    if (!safe || addOwner.value.length == 0)
      return;
      
    const tx = await safe.createRemoveOwnerTx({ownerAddress: addOwner.value , threshold:1});
    await safe.executeTransaction(tx);
  }
  const LoadContract = async () => {
      
    if (gnosisContract.length != 0) {
      if (!signer)
        return;
      const ethAdapter = new EthersAdapter({ ethers, signer })
      const tx = await Safe.create({ ethAdapter, safeAddress: gnosisContract })

      SetSafe(tx);      
    } else {
      CreateContract();
    }
  }

  const changeAmount = (e: { target: { value: any } }) => {
    const { value } = e.target;
    setGnosisContract(value);
  };

  const changeDestination = (e: { target: { value: any } }) => {
    const { value } = e.target;
    setDestination(value);
  };

  return (
    <div className="flex h-screen flex-col">
      <nav className="flex flex-row justify-between p-4">
        <Web3Button />
      </nav>

      <main className="grow text-center">
        <h1 className="pb-8 text-4xl font-bold">Gnosis Safe Testing</h1>
        <Web3Address />
        <div className="flex flex-row justify-center m-5">
            <Button className={styles.button} onClick={LoadContract}> Contract Load/Create </Button>
            <Input 
              type="text" 
              id="gnosis" 
              name="fname"  
              style={{"width":"400px"}} 
              value = {gnosisContract} 
              onChange={changeAmount}
            />
        </div>      
        <div className={styles.border}/>
        <List
          header={<div>Contract Owners({owners?.length})</div>}
          bordered
          dataSource={owners}
          renderItem={item => (
            <List.Item>
              <Typography.Text>Owner:</Typography.Text> {item}
            </List.Item>
          )} 
        />
        <div className="flex flex-row justify-center m-1">
            <Button className={styles.button} onClick={AddOwner}> Add </Button> 
            <Input type="text" id="owner" name="fname"  style={{"width":"400px"}}/>
            <Button className={styles.button} onClick={RemoveOwner}> Remove </Button>
        </div>            
        <div className={styles.border}/>
        <div className="flex flex-col justify-center m-1">
          <p>Pancake Swap</p>
          <div className="flex flex-row justify-center m-1">
            <Button className={styles.button} onClick={() => ApproveToken(USDT_ADDRESS, swapAmount)}> Approve USDT </Button>
            <Button className={styles.button} onClick={SwapUSDTtoBLID}> SWAP (1USDT - BLID) </Button>
          </div>
          <div className="flex flex-row justify-center m-1">
            <Button className={styles.button} onClick={() => ApproveToken(BLID_ADDRESS, swapAmount)}> Approve BLID </Button>
            <Button className={styles.button} onClick={SwapBLIDtoUSDT}> SWAP (1BLID - USDT) </Button>
          </div>
        </div>        
        <div className={styles.border}/>    
        <div className="flex flex-col justify-center m-1">
          <p>Distribution BLID</p>
          <div className="flex flex-row justify-center m-1">
            <Button className={styles.button} onClick={TransferBLID}> 1BLID send to </Button>
            <Input 
                type="text" 
                name="fname"  
                style={{"width":"400px"}}
                value = {destination} 
                onChange={changeDestination}/>
          </div>
        </div>
        <div className={styles.border}/>
        <Button className={styles.button} onClick={ExecuteBatch}> Exeute Batch </Button>
      </main>

    </div>
  )
}

export default Home
