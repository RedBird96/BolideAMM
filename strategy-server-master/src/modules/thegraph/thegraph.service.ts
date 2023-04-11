import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { RollbarLogger } from 'nestjs-rollbar';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';

interface DepositsCountsAndEarnEntities {
  depositCounts: Array<{
    count: string;
  }>;
  addEarnEntities: Array<{
    amount: string;
    timestamp: string;
    usd: string;
  }>;
}

interface TheGraphResponse {
  data: DepositsCountsAndEarnEntities;
}

const WEEK_MS = 604_800;

@Injectable()
export class TheGraphService {
  private readonly logger = new Logger(TheGraphService.name);

  constructor(private readonly rollbarLogger: RollbarLogger) {}

  async getDepositsAndEarnInfo(
    url: string,
  ): Promise<DepositsCountsAndEarnEntities | null> {
    try {
      const now = Date.now() / 1000;
      const timestamp = Number.parseInt(String(now), 10) - WEEK_MS;

      const query = `
        {
          depositCounts{
            count
          }
          addEarnEntities(orderBy: timestamp, orderDirection:asc, where: {timestamp_gte: ${timestamp}}) {
            amount
            timestamp
            usd
          }
        }
      `;

      const { data: graphRespBody } = await axios.post<TheGraphResponse>(url, {
        query: query.toString(),
      });

      if (
        graphRespBody &&
        graphRespBody.data &&
        graphRespBody.data.addEarnEntities &&
        graphRespBody.data.depositCounts
      ) {
        this.logger.debug({
          data: graphRespBody.data,
          message: 'getDepositsAndEarnInfo',
        });

        return graphRespBody.data;
      }

      throw new LogicException(ERROR_CODES.THE_GRAPH_RESPONSE_ERROR);
    } catch (error) {
      this.rollbarLogger.error(
        error,
        `The Graph: getDepositsAndEarnInfo url: ${url}`,
      );

      throw new LogicException(ERROR_CODES.THE_GRAPH_RESPONSE_ERROR);
    }
  }
}
