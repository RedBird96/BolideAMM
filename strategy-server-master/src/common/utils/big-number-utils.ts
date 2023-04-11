import { ethers } from 'ethers';
import Web3 from 'web3';
import type { Unit } from 'web3/utils';

import { BigNumber } from './BigNumber';

const web3 = new Web3();

export const safeBN = (v: BigNumber) => {
  const value = v.toString(10);

  return value.includes('.') ? value.split('.')[0] : value;
};

export const toBN = (value: string | number): BigNumber => {
  let data = value ? value : 0;
  data = !Number.isNaN(data) ? data : 0;

  return new BigNumber(data);
};

export const toWei = (value: BigNumber, decimals = 18): BigNumber => {
  const wei = ethers.utils.parseUnits(value.toString(10), decimals).toString();

  return toBN(wei);
};

export const toWeiBN = (value: number, decimals = 18): BigNumber =>
  toWei(toBN(value), decimals);

export const fromWei = (value: BigNumber, decimals = 18): BigNumber => {
  const prepValue = value.toString(10).split('.')[0]; // if has decimals, formatUnits will throw error
  const eth = ethers.utils.formatUnits(prepValue, decimals).toString();

  return toBN(eth);
};

export const fromWeiToStr = (value: BigNumber, decimals = 18): string =>
  fromWei(value, decimals).toString(10);

export const fromWeiToNum = (value: BigNumber, decimals = 18): number =>
  fromWei(value, decimals).toNumber();

export const numWei = (value: string, unit?: Unit): number =>
  Number(web3.utils.fromWei(value, unit));

export const MILLION = toWeiBN(1_000_000);
