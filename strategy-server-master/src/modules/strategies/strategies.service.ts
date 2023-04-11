import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { isNumber } from 'lodash';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { STRATEGY_TYPES } from 'src/common/constants/strategy-types';
import { LogicException } from 'src/common/logic.exception';
import type { DeleteResult, UpdateResult } from 'typeorm';
import type Web3 from 'web3';

import { TG_MESSAGES } from '../../common/constants/tg-messages';
import { CONTRACT_TYPES } from '../contracts/constants/contract-types';
import { ContractsService } from '../contracts/contracts.service';
import type { GetVaultPortfolioDto } from '../external-api/dto/GetVaultPortfolioDto';
import { LbfAnalyticsService } from '../land-borrow-farm-strategy/analytics/lbf-analytics.service';
import type { SaveLbfStat } from '../land-borrow-farm-strategy/analytics/lbf-stats.repository';
import type { LBF_BULL_EVENTS } from '../land-borrow-farm-strategy/constants/lbf-bull-events';
import type { LandBorrowFarmSettingsDto } from '../land-borrow-farm-strategy/dto/LandBorrowFarmSettingsDto';
import { LandBorrowFarmSettingsUpdateDto } from '../land-borrow-farm-strategy/dto/LandBorrowFarmSettingsUpdateDto';
import { LbfService } from '../land-borrow-farm-strategy/lbf.service';
import { LandBorrowSettingsUpdateDto } from '../land-borrow-strategy/dto/LandBorrowSettingsUpdateDto';
import type { OperationDto } from '../operations/dto/OperationDto';
import type { OPERATION_TYPE } from '../operations/operation.entity';
import { OperationsService } from '../operations/operations.service';
import { PairsService } from '../pairs/pairs.service';
import { TelegramService } from '../telegram/telegram.service';
import type { StrategyCreateDto } from './dto/StrategyCreateDto';
import { StrategyDto } from './dto/StrategyDto';
import type { StrategyListOptionsDto } from './dto/StrategyListOptionsDto';
import type { StrategyNameUpdateDto } from './dto/StrategyNameUpdateDto';
import type { StrategySettingsUpdateDto } from './dto/StrategySettingsUpdateDto';
import type { StrategyStatusUpdateDto } from './dto/StrategyStatusUpdateDto';
import type { StrategyUpdateDto } from './dto/StrategyUpdateDto';
import { SettingsValidationService } from './settings-validation.service';
import { StrategiesRepository } from './strategies.repository';
import { StrategiesRunnerService } from './strategies-runner.service';
import type { StrategyEntity } from './strategy.entity';
import type { StrategyPairAddDto } from './strategy-pair/dto/StrategyPairAddDto';
import { StrategyPairDto } from './strategy-pair/dto/StrategyPairDto';
import type { StrategyPairListDto } from './strategy-pair/dto/StrategyPairListDto';
import type { StrategyPairListOptionsDto } from './strategy-pair/dto/StrategyPairListOptionsDto';
import type { StrategyPairUpdateDto } from './strategy-pair/dto/StrategyPairUpdateDto';
import { StrategyPairRepository } from './strategy-pair/strategy-pair.repository';

type StrategyIdentificator = number | string;

export const DEFAULT_LAND_BORROW_FARM_SETTINGS = {
  adminMinBnbBalance: 0.2,
  adminBalanceCheckTimeoutMilliseconds: 1_800_000,
  isBoostingBalanceCheckCronEnabled: false,
  analyticsTimeoutMilliseconds: 900_000, // 15 minuts
  boostingBalanceCheckTimeoutMilliseconds: 900_000 * 4, // 1 hour
  isStrategyChangeNotify: false,
  isAdminBalanceCronEnabled: false,
  isAnalyticsCronEnabled: false,
  isBnbBorrowLimitCronEnabled: true,
  isAutostartEnabled: false,
  isClaimAutostartEnabled: false,
  timeoutMilliseconds: 900_000, // 15 minuts
  claimTimeoutMilliseconds: 4 * 3_600_000, // 4 hours
  quantityTokensInBlock: 0,
  borrowLimitPercentage: 0.92,
  borrowLimitPercentageMin: 0.88,
  borrowLimitPercentageMax: 0.96,
  claimMinUsd: 0.96,
  isFailedDistributeNotification: true,
  isDistributeIfNegativeBalance: false,
  maxBlidRewardsDestribution: 1,
  farmCheckSumInUsd: 100,
  farmMaxDiffPercent: 2,
  boostingWalletMinBlidBalanceUsd: 2,
  minTakeTokenFromStorageEther: 0.000_001,
  theGraphApiUrl: '',
  isTransactionProdMode: true,
  isClaimVenus: false,
  isClaimFarms: true,
  isClaimLended: false,
  isVenusClaimAutostartEnabled: false,
  venusClaimTimeoutMilliseconds: 86_400_000,
};

@Injectable()
export class StrategiesService {
  constructor(
    private readonly strategyRepository: StrategiesRepository,
    private readonly strategyPairRepository: StrategyPairRepository,
    @Inject(forwardRef(() => PairsService))
    private readonly pairsService: PairsService,
    private readonly operationsService: OperationsService,
    private readonly telegramService: TelegramService,
    private readonly contractsService: ContractsService,
    private readonly strategiesRunnerService: StrategiesRunnerService,
    private readonly settingsValidationService: SettingsValidationService,
    private readonly lbfService: LbfService,
    @Inject(forwardRef(() => LbfAnalyticsService))
    private readonly lbfAnalyticsService: LbfAnalyticsService,
  ) {}

  async runOrStopStartegy(strategy: StrategyDto) {
    const { isActive } = strategy;

    // eslint-disable-next-line unicorn/prefer-ternary
    if (isActive) {
      await this.strategiesRunnerService.runStrategy({
        strategy,
      });
    } else {
      await this.strategiesRunnerService.stopStrategy({
        strategy,
      });
    }
  }

  async getStrategies(pageOptionsDto: StrategyListOptionsDto) {
    return this.strategyRepository.getItems(pageOptionsDto);
  }

  async getAllStrategies(): Promise<StrategyDto[]> {
    const entities = await this.strategyRepository.find();

    return entities.map((entity) => entity.toDto());
  }

  async getActiveStrategies(): Promise<StrategyDto[]> {
    const entities = await this.strategyRepository.find({ isActive: true });

    return entities.map((entity) => entity.toDto());
  }

  async getStrategyByName(name: string): Promise<StrategyDto> {
    try {
      const strategy = await this.getStrategyOrFail(name);

      return strategy.toDto();
    } catch {
      return null;
    }
  }

  async getStrategyById(strategyId: number): Promise<StrategyDto> {
    try {
      const strategy = await this.getStrategyOrFail(strategyId);

      return strategy.toDto();
    } catch {
      return null;
    }
  }

  async createStrategy(data: StrategyCreateDto): Promise<StrategyDto> {
    let settings = {};

    if (data.type === STRATEGY_TYPES.LAND_BORROW_FARM) {
      settings = {
        ...DEFAULT_LAND_BORROW_FARM_SETTINGS,
      };
    }

    const strategy = await this.strategyRepository.create({
      type: data.type,
      name: data.name,
      blockchainId: data.blockchainId,
      logicContractId: data.logicContractId,
      storageContractId: data.storageContractId,
      operationsPrivateKeyId: data.operationsPrivateKeyId,
      boostingPrivateKeyId: data.boostingPrivateKeyId,
      isActive: false,
      settings,
    });

    await this.strategyRepository.save(strategy);

    return strategy.toDto();
  }

  async updateStrategyById(
    strategyId: number,
    data: StrategyUpdateDto,
  ): Promise<StrategyDto> {
    const strategy = await this.getStrategyOrFail(strategyId);

    const toUpdateData: any = {
      ...data,
      isActive: false,
    };

    if (data.storageContractId) {
      const contract = await this.contractsService.findOneEntityById(
        data.storageContractId,
      );

      if (contract.type !== CONTRACT_TYPES.STR_STORAGE) {
        throw new LogicException(ERROR_CODES.STRATEGY_CONTRACT_TYPE_MISTMATCH);
      }

      toUpdateData.storageContract = contract;
    }

    if (data.logicContractId) {
      const contract = await this.contractsService.findOneEntityById(
        data.logicContractId,
      );

      if (contract.type !== CONTRACT_TYPES.STR_LOGIC) {
        throw new LogicException(ERROR_CODES.STRATEGY_CONTRACT_TYPE_MISTMATCH);
      }

      toUpdateData.logicContract = contract;
    }

    const updatedStrategy = await this.updateStrategy(strategyId, toUpdateData);

    if (strategy.settings?.isStrategyChangeNotify) {
      await this.telegramService.sendMessageToGroup(
        TG_MESSAGES.STRATEGY_CHANGED({
          strategyName: strategy.name,
          changes: data,
        }),
      );
    }

    await this.runOrStopStartegy(updatedStrategy);

    return updatedStrategy;
  }

  async updateStrategyStatusById(
    strategyId: number,
    data: StrategyStatusUpdateDto,
  ): Promise<StrategyDto> {
    const isValid =
      await this.settingsValidationService.validateSettingsAndSendNoti(
        strategyId,
      );

    if (!isValid && data.isActive) {
      throw new LogicException(ERROR_CODES.SETTINGS_SETTINGS_INVALID);
    }

    const updatedStrategy = await this.updateStrategyStatus(
      strategyId,
      data.isActive,
    );

    if (updatedStrategy.settings?.isStrategyChangeNotify) {
      await this.telegramService.sendMessageToGroup(
        TG_MESSAGES.STRATEGY_CHANGE_STATUS({
          strategyName: updatedStrategy.name,
          isActive: data.isActive,
        }),
      );
    }

    await this.runOrStopStartegy(updatedStrategy);

    return updatedStrategy;
  }

  async updateStrategyNameById(
    strategyId: number,
    data: StrategyNameUpdateDto,
  ): Promise<StrategyDto> {
    const found = await this.strategyRepository.findOne({
      where: {
        id: strategyId,
      },
    });

    if (!found) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY);
    }

    const entity = await this.strategyRepository.save({
      ...found,
      ...data,
    });

    return new StrategyDto(entity);
  }

  async updateStrategySettingsById(data: {
    id: number;
    newSettins: StrategySettingsUpdateDto;
  }): Promise<StrategyDto> {
    const { id, newSettins } = data;

    const foundStrategy = await this.strategyRepository.findOne({ id });

    if (!foundStrategy) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY);
    }

    let settings;

    switch (foundStrategy.type) {
      case STRATEGY_TYPES.LAND_BORROW_FARM:
        settings = plainToInstance(LandBorrowFarmSettingsUpdateDto, newSettins);
        break;
      case STRATEGY_TYPES.LAND_BORROW:
        settings = plainToInstance(LandBorrowSettingsUpdateDto, newSettins);
        break;
      default:
        throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY_TYPE);
    }

    const entity = await this.strategyRepository.save({
      ...foundStrategy,
      settings,
    });

    const updatedStrategy = new StrategyDto(entity);

    await this.runOrStopStartegy(updatedStrategy);

    return updatedStrategy;
  }

  async getStrategPairsByStrId(
    strategyId: number,
    pageOptionsDto: StrategyPairListOptionsDto,
  ): Promise<StrategyPairListDto> {
    const pairList = await this.strategyPairRepository.getItemsWithPairs(
      strategyId,
      pageOptionsDto,
    );

    for (const item of pairList.items) {
      const pair = await this.pairsService.findOneById(item.pairId);
      item.pair = pair;
    }

    return pairList;
  }

  async updateStrategyPair(
    strategyId: number,
    pairId: number,
    data: StrategyPairUpdateDto,
  ): Promise<StrategyPairDto> {
    const strategy = await this.getStrategyOrFail(strategyId);

    const strategyPair = await this.strategyPairRepository.findOne(
      {
        strategyId,
        pairId,
      },
      { relations: ['strategy'] },
    );

    if (!strategyPair) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY_PAIR);
    }

    const newPair = await this.pairsService.findOneById(data.newPairId);

    if (!newPair) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_PAIR);
    }

    const newPairPercentage = await this.validateAndGetPairPercent(
      strategyId,
      data.percentage,
      strategyPair.percentage,
    );

    strategyPair.pairId = data.newPairId;
    strategyPair.percentage = newPairPercentage;

    await this.strategyPairRepository.save(strategyPair);

    if (strategy.settings?.isStrategyChangeNotify) {
      await this.telegramService.sendMessageToGroup(
        TG_MESSAGES.STRATEGY_UPDATE_PAIR({
          strategyName: strategyPair.strategy.name,
          pairName: newPair.farm.pair,
        }),
      );
    }

    return new StrategyPairDto(strategyPair, newPair);
  }

  async addStrategyPair(
    strategyId: number,
    data: StrategyPairAddDto,
  ): Promise<StrategyPairListDto> {
    const strategy = await this.getStrategyOrFail(strategyId);

    const pair = await this.pairsService.findOneById(data.pairId);

    if (!pair) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_PAIR);
    }

    const newPairPercentage = await this.validateAndGetPairPercent(
      strategyId,
      data.percentage,
    );

    await this.strategyPairRepository.save({
      strategyId,
      pairId: data.pairId,
      percentage: newPairPercentage,
    });

    if (strategy.settings?.isStrategyChangeNotify) {
      await this.telegramService.sendMessageToGroup(
        TG_MESSAGES.STRATEGY_ADD_PAIR({
          strategyName: strategy.name,
          pairName: pair.farm.pair,
        }),
      );
    }

    return this.getStrategPairsByStrId(strategyId, {
      page: 1,
      take: 100,
    } as StrategyPairListOptionsDto);
  }

  async deleteStrategy(strategyId: number): Promise<void> {
    const strategy = await this.strategyRepository.findOne(strategyId);

    if (!strategy) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY);
    }

    if (strategy.isActive) {
      throw new LogicException(ERROR_CODES.STRATEGY_DELETE_IS_ACTIVE);
    }

    const operations = await this.operationsService.findByStrategy(strategyId);

    if (operations.length > 0) {
      throw new LogicException(ERROR_CODES.STRATEGY_DELETE_OPERATIONS);
    }

    await this.strategyRepository.delete(strategyId);

    await this.strategiesRunnerService.stopStrategy({
      strategy: strategy.toDto(),
    });
  }

  async getStrategiesByPairId(pairId: number): Promise<StrategyDto[]> {
    const strategiesPairs = await this.strategyPairRepository.find({
      where: { pairId },
      relations: ['strategy'],
    });

    return strategiesPairs.map((item) => item.strategy);
  }

  async deletePairFromAllStrategies(pairId: number) {
    const strategies = await this.getStrategiesByPairId(pairId);

    for (const strategy of strategies) {
      await this.deleteStrategyPair(strategy.id, pairId);
    }
  }

  async deleteStrategyPair(
    strategyId: number,
    pairId: number,
  ): Promise<StrategyPairListDto> {
    const strategy = await this.getStrategyOrFail(strategyId);

    if (!isNumber(pairId)) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_PAIR);
    }

    const strategyPair = await this.strategyPairRepository.findOne({
      strategyId,
      pairId,
    });

    if (!strategyPair) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY_PAIR);
    }

    const pair = await this.pairsService.findOneById(pairId);

    await this.strategyPairRepository.delete(strategyPair.id);

    await this.updateStrategyStatus(strategyId, false);

    if (strategy.settings?.isStrategyChangeNotify) {
      await this.telegramService.sendMessageToGroup(
        TG_MESSAGES.STRATEGY_DELETE_PAIR({
          strategyName: strategy.name,
          pairName: pair.farm.pair,
        }),
      );
    }

    await this.strategiesRunnerService.stopStrategy({
      strategy: strategy.toDto(),
    });

    return this.getStrategPairsByStrId(strategyId, {
      page: 1,
      take: 100,
    } as StrategyPairListOptionsDto);
  }

  private async getStrategyOrFail(
    id: StrategyIdentificator,
  ): Promise<StrategyEntity> {
    const conditions = typeof id === 'number' ? { id } : { name: id };
    const strategy = await this.strategyRepository.findOne(conditions, {
      relations: ['storageContract', 'logicContract'],
    });

    if (!strategy) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY);
    }

    return strategy;
  }

  private async updateStrategy(
    strategyId: number,
    updatedFields: StrategyUpdateDto,
  ): Promise<StrategyDto> {
    const found = await this.strategyRepository.findOne({
      where: {
        id: strategyId,
      },
    });

    if (!found) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY);
    }

    const entity = await this.strategyRepository.save({
      ...found,
      ...updatedFields,
    });

    return new StrategyDto(entity);
  }

  private async updateStrategyStatus(strategyId: number, isActive: boolean) {
    const found = await this.strategyRepository.findOne({
      where: {
        id: strategyId,
      },
    });

    if (!found) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY);
    }

    const entity = await this.strategyRepository.save({
      ...found,
      isActive,
    });

    return new StrategyDto(entity);
  }

  async softDeletePair(pairId: number): Promise<UpdateResult> {
    return this.strategyPairRepository.softDelete({ pairId });
  }

  async deleteAllPairs(): Promise<DeleteResult> {
    return this.strategyPairRepository.deleteAll();
  }

  async validateAndGetPairPercent(
    strategyId: number,
    newPercentage: number,
    oldPercentage = 0,
  ): Promise<number> {
    const strategyPairs = await this.strategyPairRepository.find({
      strategyId,
    });

    const currentPercentage = strategyPairs.reduce(
      (sum, sp) => sum + sp.percentage,
      0,
    );

    const newPairPercentage = Math.floor(newPercentage * 100) / 100;

    if (currentPercentage - oldPercentage + newPairPercentage > 1) {
      throw new LogicException(ERROR_CODES.STRATEGY_PAIR_INCORRECT_PERCENTAGE);
    }

    return newPairPercentage;
  }

  async runOperationByRestApiCall(data: {
    strategyId: number;
    type: OPERATION_TYPE;
    lbfBullEvent: LBF_BULL_EVENTS;
    payload?: Record<string, any>;
  }): Promise<{
    msg: string;
    operation?: OperationDto;
  }> {
    const { strategyId, type, lbfBullEvent, payload = {} } = data;

    const strategy = await this.getStrategyById(strategyId);

    if (!strategy) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY);
    }

    if (strategy.type === STRATEGY_TYPES.LAND_BORROW_FARM) {
      return this.lbfService.runOperationByRestApiCall({
        strategyId,
        type,
        lbfBullEvent,
        payload,
      });
    }

    throw new LogicException(
      ERROR_CODES.NOT_IMPLEMENTED('runOperationByRestApiCall'),
    );
  }

  async calcAnalytics(data: {
    strategyId: number;
    web3: Web3;
  }): Promise<SaveLbfStat> {
    const { strategyId, web3 } = data;

    const strategy = await this.getStrategyById(strategyId);

    if (!strategy) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY);
    }

    if (strategy.type === STRATEGY_TYPES.LAND_BORROW_FARM) {
      return this.lbfAnalyticsService.calcAnalytics({ strategyId, web3 });
    }

    throw new LogicException(ERROR_CODES.NOT_IMPLEMENTED('calcAnalytics'));
  }

  async getVaultPortfolio(data: {
    storage: string;
  }): Promise<GetVaultPortfolioDto> {
    const storageContract = await this.contractsService.getContract({
      address: data.storage,
    });

    if (!storageContract) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STORAGE);
    }

    const strategy = await this.strategyRepository.findOne({
      storageContractId: storageContract.id,
    });

    if (!strategy) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY);
    }

    if (strategy.type === STRATEGY_TYPES.LAND_BORROW_FARM) {
      const balancesAndAnalytics =
        await this.lbfAnalyticsService.getLastAnalyticData(strategy.id);

      let logicContract = null;

      if (strategy.logicContractId) {
        logicContract = await this.contractsService.getContractById(
          strategy.logicContractId,
        );
      }

      const lendedTokens = {};

      for (const key in balancesAndAnalytics.lendedTokens) {
        lendedTokens[key] =
          balancesAndAnalytics.lendedTokens[key].vTokenBalance;
      }

      return {
        strategyId: balancesAndAnalytics.strategyId,
        venusPercentLimit: balancesAndAnalytics.venusPercentLimit,
        walletInfo: balancesAndAnalytics.walletInfo,
        farmingEarns: balancesAndAnalytics.farmingEarns,
        lendedTokens,
        borrowed: balancesAndAnalytics.borrowed,
        staked: balancesAndAnalytics.staked,
        stakedPortfolio: balancesAndAnalytics.stakedPortfolio,
        lendedTotal: balancesAndAnalytics.lendedTotal,
        logicContractAddress: logicContract.address,
      };
    }

    throw new LogicException(
      ERROR_CODES.NOT_IMPLEMENTED('getQuantityTokensInBlock'),
    );
  }

  async getQuantityTokensInBlockByStorage(data: {
    storage: string;
  }): Promise<number> {
    const storageContract = await this.contractsService.getContract({
      address: data.storage,
    });

    if (!storageContract) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STORAGE);
    }

    const strategy = await this.strategyRepository.findOne({
      storageContractId: storageContract.id,
    });

    if (!strategy) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY);
    }

    if (strategy.type === STRATEGY_TYPES.LAND_BORROW_FARM) {
      const settings = strategy.settings as LandBorrowFarmSettingsDto;

      return settings.quantityTokensInBlock;
    }

    throw new LogicException(
      ERROR_CODES.NOT_IMPLEMENTED('getQuantityTokensInBlock'),
    );
  }

  async getQuantityTokensInBlock(data: {
    strategyId: number;
  }): Promise<number> {
    const { strategyId } = data;

    const strategy = await this.getStrategyById(strategyId);

    if (!strategy) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY);
    }

    if (strategy.type === STRATEGY_TYPES.LAND_BORROW_FARM) {
      return this.lbfService.getQuantityTokensInBlock(strategyId);
    }

    throw new LogicException(
      ERROR_CODES.NOT_IMPLEMENTED('getQuantityTokensInBlock'),
    );
  }
}
