import 'hardhat-jest-plugin';
import '@typechain/hardhat';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import './tasks/test-jest-override';

import { config as dotEnvConfig } from 'dotenv';
import type { HardhatUserConfig } from 'hardhat/types';

const settings = { optimizer: { enabled: true, runs: 1000 } };

dotEnvConfig();

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  solidity: {
    compilers: [
      { version: '0.4.18', settings: {} },
      { version: '0.5.16', settings: {} },
      { version: '0.6.6', settings },
      { version: '0.6.12', settings },
      { version: '0.8.0', settings: {} },
      { version: '0.8.1', settings: {} },
      { version: '0.8.13', settings },
    ],
  },

  networks: {
    coverage: {
      url: 'http://127.0.0.1:8555', // Coverage launches its own ganache-cli client
    },
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
};

// eslint-disable-next-line import/no-default-export
export default config;
