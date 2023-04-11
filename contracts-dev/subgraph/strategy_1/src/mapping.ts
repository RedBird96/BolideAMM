import { BigInt } from "@graphprotocol/graph-ts"

import {
  Storage,
  AddEarn,
  Deposit,
  InterestFee,
  OwnershipTransferred,
  Paused,
  ReturnToken,
  TakeToken,
  Unpaused,
  UpdateBLIDBalance,
  UpdateTokenBalance,
  Withdraw
} from "../generated/Storage/Storage"
import { DepositCount,DepositBalance,AddEarnEntity } from "../generated/schema"

export function handleAddEarn(event: AddEarn): void {
  let eanred = new AddEarnEntity(event.block.hash.toHexString());
  eanred.amount=event.params.amount;
  let contract =  Storage.bind(event.address);
  {
    let id = contract.getCountEarns();
    id = id.minus(BigInt.fromString("1"));
    let array= contract.getEarnsByID(id);
    eanred.usd=array.value2;
  }
  eanred.timestamp=event.block.timestamp;
  eanred.save();
}

export function handleDeposit(event: Deposit): void {
  let userCount=  DepositCount.load("userCount");
  if(userCount==null) {
    userCount= new DepositCount("userCount");
  }
  let depositor = DepositBalance.load(event.params.depositor.toHexString())
  if(depositor==null) {
    depositor = new DepositBalance(event.params.depositor.toHexString());
    depositor.tokenBalance= event.params.amount;
    userCount.count=userCount.count.plus(BigInt.fromString("1"));
  }else{
    if(depositor.tokenBalance.equals(BigInt.zero())){
      userCount.count=userCount.count.plus(BigInt.fromString("1"));
    }
    depositor.tokenBalance=depositor.tokenBalance.plus(event.params.amount);
  }
  userCount.save();
  depositor.save();
}

export function handleWithdraw(event: Withdraw): void {
  let userCount=  DepositCount.load("userCount");
  let depositor = DepositBalance.load(event.params.depositor.toHexString());
  if(userCount!=null&&depositor!=null) {
    depositor.tokenBalance=depositor.tokenBalance.minus(event.params.amount);
    if(depositor.tokenBalance.equals(BigInt.zero())){
      userCount.count=userCount.count.minus(BigInt.fromString("1"));
    }
    userCount.save();
    depositor.save();
  }
 
}

export function handleInterestFee(event: InterestFee): void {}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}

export function handlePaused(event: Paused): void {}

export function handleReturnToken(event: ReturnToken): void {}

export function handleTakeToken(event: TakeToken): void {}

export function handleUnpaused(event: Unpaused): void {}

export function handleUpdateBLIDBalance(event: UpdateBLIDBalance): void {}

export function handleUpdateTokenBalance(event: UpdateTokenBalance): void {}

