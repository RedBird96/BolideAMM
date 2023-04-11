import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import type { AxiosResponse } from 'axios';
import { RollbarLogger } from 'nestjs-rollbar';
import { firstValueFrom } from 'rxjs';

type BinanceTickerPriceResponseBody = Array<{
  symbol: string;
  price: string;
}>;

const BINANCE_API_BASE_URL = 'https://api.binance.com/api/v3';

@Injectable()
export class BinanceApiService {
  private readonly logger = new Logger(BinanceApiService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly rollbarLogger: RollbarLogger,
  ) {}

  async getTickerPrice(): Promise<BinanceTickerPriceResponseBody | null> {
    try {
      const response: AxiosResponse<BinanceTickerPriceResponseBody> =
        await firstValueFrom(
          this.httpService.get(BINANCE_API_BASE_URL + '/ticker/price'),
        );

      return response.data;
    } catch (error) {
      this.logger.error({ error, message: 'getTickerPrice' });
      this.rollbarLogger.error(error, 'getTickerPrice');

      return null;
    }
  }
}
