import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { BLOCKCHAIN_NAMES } from 'src/common/constants/blockchain-names';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';
import { Repository } from 'typeorm';

import { BnbAnalyticsWorkers } from '../bnb/analytics/bnb-analytics.workers';
import type { BnbSettingsDto } from '../bnb/dto/BnbSettingsDto';
import { BnbSettingsUpdateDto } from '../bnb/dto/BnbSettingsUpdateDto';
import { BlockchainEntity } from './blockchain.entity';
import type { BlockchainDto } from './dto/BlockchainDto';
import type { BlockchainSettingsUpdateDto } from './dto/BlockchainSettingsUpdateDto';

@Injectable()
export class BlockchainsSettingsService {
  constructor(
    @InjectRepository(BlockchainEntity)
    private readonly repository: Repository<BlockchainEntity>,
    private readonly bnbAnalyticsWorkers: BnbAnalyticsWorkers,
  ) {}

  async updateBlockchainSettings(
    blockchainIdOrName: number | BLOCKCHAIN_NAMES,
    data: BlockchainSettingsUpdateDto,
  ): Promise<BlockchainDto> {
    const blockchain = await (typeof blockchainIdOrName === 'number'
      ? this.repository.findOne({ id: blockchainIdOrName })
      : this.repository.findOne({ name: blockchainIdOrName }));

    if (!blockchain) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_BLOCKCHAIN);
    }

    let settings: BlockchainSettingsUpdateDto;

    if (blockchain.name === BLOCKCHAIN_NAMES.BNB) {
      settings = plainToInstance(BnbSettingsUpdateDto, data);
    }

    blockchain.settings = { ...blockchain.settings, ...settings };
    await this.repository.save(blockchain);

    if (
      blockchain.name === BLOCKCHAIN_NAMES.BNB &&
      (blockchain.settings as BnbSettingsDto).isAnalyticsStatCronEnabled &&
      data.isAnalyticsStatCronEnabled
    ) {
      await this.bnbAnalyticsWorkers.initWorkers();
    }

    return blockchain.toDto();
  }
}
