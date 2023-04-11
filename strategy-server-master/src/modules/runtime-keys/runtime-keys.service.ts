import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ERROR_CODES } from '../../common/constants/error-codes';
import { LogicException } from '../../common/logic.exception';
import { StrategiesRepository } from '../strategies/strategies.repository';
import type { StrategyEntity } from '../strategies/strategy.entity';
import type { RuntimeKeyCreateDto } from './dto/RuntimeKeyCreateDto';
import type { RuntimeKeyDto } from './dto/RuntimeKeyDto';
import type { RuntimeKeyUpdateDto } from './dto/RuntimeKeyUpdateDto';
import { RuntimeKeyEntity } from './runtime-key.entity';

@Injectable()
export class RuntimeKeysService {
  constructor(
    @InjectRepository(RuntimeKeyEntity)
    private readonly repository: Repository<RuntimeKeyEntity>,
    private readonly strategyRepository: StrategiesRepository,
  ) {}

  async getAll(): Promise<RuntimeKeyDto[]> {
    const list = await this.repository.find();

    return list.map((item) => item.toDto());
  }

  async getById(id: number): Promise<RuntimeKeyDto> {
    const item = await this.repository.findOne(id);

    return item ? item.toDto() : null;
  }

  async create(data: RuntimeKeyCreateDto): Promise<RuntimeKeyDto> {
    const item = this.repository.create(data);
    await this.repository.save(item);

    return item.toDto();
  }

  async updateById(
    id: number,
    data: RuntimeKeyUpdateDto,
  ): Promise<RuntimeKeyDto> {
    await this.repository.update({ id }, { ...data });

    return this.getById(id);
  }

  async removeById(runtimeKeyId: number): Promise<void> {
    const item = await this.repository.findOne(runtimeKeyId);

    if (!item) {
      throw new LogicException(ERROR_CODES.NOT_FOUND);
    }

    const strategy = await this.getStrategyByRuntimeKey(runtimeKeyId);

    if (strategy) {
      if (strategy.isActive) {
        throw new LogicException(
          ERROR_CODES.RUNTIME_KEY_DELETE_STRATEGY_IS_ACTIVE,
        );
      }

      await this.removeStrategyKeys(strategy, runtimeKeyId);
    }

    await this.repository.delete({ id: runtimeKeyId });
  }

  async getStrategyByRuntimeKey(
    runtimeKeyId: number,
  ): Promise<StrategyEntity | null> {
    try {
      return await this.strategyRepository.findOne({
        where: [
          { operationsPrivateKeyId: runtimeKeyId },
          { boostingPrivateKeyId: runtimeKeyId },
        ],
      });
    } catch {
      return null;
    }
  }

  async removeStrategyKeys(
    strategy: StrategyEntity,
    runtimeKeyId: number,
  ): Promise<void> {
    if (strategy.boostingPrivateKeyId === runtimeKeyId) {
      strategy.boostingPrivateKeyId = null;
    }

    if (strategy.operationsPrivateKeyId === runtimeKeyId) {
      strategy.operationsPrivateKeyId = null;
    }

    await this.strategyRepository.save(strategy);
  }
}
