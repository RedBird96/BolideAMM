import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { RollbarLogger } from 'nestjs-rollbar';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';

interface UniswapPoolItem {
  id?: string;
  token0Price?: string;
  token1Price?: string;
}

interface UniswapPoolDataResponse {
  data?: {
    pools?: UniswapPoolItem[];
  };
}

const UNISWAP_POOL_USDT_BLID_POOL_ADDRESS =
  '0xaf58b12857196b9db7997539dc9694f8313c31c2';

// process.env.VUE_APP_BLID_BALANCE_API || '';
const UNISWAP_POOLS_URL =
  'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';

@Injectable()
export class UniswapApiService {
  constructor(private readonly rollbarLogger: RollbarLogger) {}

  private readonly logger = new Logger(UniswapApiService.name);

  async getUsdtBlidPoolData(): Promise<UniswapPoolItem> {
    this.logger.debug({ message: 'executing getUsdtBlidPoolData' });

    const options = {
      operationName: 'pools',
      variables: {},
      query: `query pools {
          pools(
            where: {
              id_in: ["${UNISWAP_POOL_USDT_BLID_POOL_ADDRESS}"]
            }
            orderBy: totalValueLockedUSD
            orderDirection: desc
            subgraphError: allow
          )
          {
            id
            token0Price
            token1Price
          }
        }`,
    };

    try {
      const response = await axios.post<UniswapPoolDataResponse>(
        UNISWAP_POOLS_URL,
        options,
      );

      if (
        response.data &&
        response.data.data &&
        response.data.data.pools &&
        response.data.data.pools[0]
      ) {
        return response.data && response.data.data.pools[0];
      }

      throw new LogicException(ERROR_CODES.UNISWAP_POOL_DATA_RESPONSE_ERROR);
    } catch (error) {
      this.rollbarLogger.error(error, 'getUsdtBlidPoolData');

      throw new LogicException(ERROR_CODES.UNISWAP_POOL_DATA_RESPONSE_ERROR);
    }
  }
}
