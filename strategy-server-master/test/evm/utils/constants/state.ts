import { APESWAP_FARMS } from './apeswap-farms';
import { APESWAP_PATHS } from './apeswap-paths';
import { BISWAP_FARMS } from './biswap-farms';
import { BISWAP_PATHS } from './biswap-paths';
import { PANCAKE_FARMS } from './pancake-farms';
import { PANCAKE_PATHS } from './pancake-paths';
import { TOKEN_ADDRESS } from './token-addresses';
import { VENUS_TOKENS } from './venus-tokens';

export const STATE = {
  venusTokens: [...VENUS_TOKENS],
  storageTokens: [
    {
      asset: 'BUSD',
      address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
      balanceStorage: '',
      balanceLogic: '',
      decimals: 18,
      approved: false,
    },
    {
      asset: 'USDT',
      address: '0x55d398326f99059fF775485246999027B3197955',
      balanceStorage: '',
      balanceLogic: '',
      decimals: 18,
      approved: false,
    },
    {
      asset: 'USDC',
      address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      balanceStorage: '',
      balanceLogic: '',
      decimals: 18,
      approved: false,
    },
    {
      asset: 'DAI',
      address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
      balanceStorage: '',
      balanceLogic: '',
      decimals: 18,
      approved: false,
    },
  ],
  farms: [...PANCAKE_FARMS, ...BISWAP_FARMS, ...APESWAP_FARMS],

  paths: {
    ApeSwap: APESWAP_PATHS,
    Pancake: PANCAKE_PATHS,
    BiSwap: BISWAP_PATHS,
  },

  logicAddress: '0x5983CC8D8F9430b788e85825AdB1c4C9a8eb83B9',
  storageAddress: '0x1b908bE9AeA4b9238307f7e08F2Eb36B10065AE7',

  apeSwapRouter: '0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7',
  apeSwapMasterChief: '0x5c8D727b265DBAfaba67E050f2f739cAeEB4A6F9',

  pancakeSwapRouter: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  pancakeSwapMasterChief: '0xa5f8c5dbd5f286960b9d90548680ae5ebff07652',

  biSwapRouter: '0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8',
  biSwapMasterChief: '0xDbc1A13490deeF9c3C12b44FE77b503c1B061739',

  TokenAddress: TOKEN_ADDRESS,
  BaseToken: TOKEN_ADDRESS.BLID,
  BaseTokenName: 'BLID',
};
