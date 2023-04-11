import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { PLATFORMS } from 'src/common/constants/platforms';
import type Web3 from 'web3';

import { FarmAnalyticService } from '../farm/farm-analytics.service';
import type { Farm } from '../interfaces/farm.interface';

@Injectable()
export class BiswapEthService {
  private readonly logger = new Logger(BiswapEthService.name);

  constructor(
    @Inject(forwardRef(() => FarmAnalyticService))
    private readonly farmAnalyticService: FarmAnalyticService,
  ) {}

  async getFarms(web3: Web3): Promise<Farm[]> {
    this.logger.debug({ message: 'executing getFarms' });

    const farmPools = await this.farmAnalyticService.getFarmPools({
      platform: PLATFORMS.BISWAP,
      web3,
    });

    return farmPools.map((farmPool) =>
      this.farmAnalyticService.farmPoolToFarm(farmPool),
    );
  }
}
