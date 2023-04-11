import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { SLACK_MESSAGES } from 'src/common/constants/slack-messages';
import { STRATEGY_TYPES } from 'src/common/constants/strategy-types';
import { LogicException } from 'src/common/logic.exception';
import { ConfigService } from 'src/shared/services/config.service';

import type { LandBorrowFarmSettingsDto } from '../land-borrow-farm-strategy/dto/LandBorrowFarmSettingsDto';
import { SlackService } from '../slack/slack.service';
import type { StrategyDto } from './dto/StrategyDto';
import { StrategiesService } from './strategies.service';

@Injectable()
export class SettingsValidationService {
  private readonly logger = new Logger(SettingsValidationService.name);

  constructor(
    @Inject(forwardRef(() => StrategiesService))
    private readonly strategiesService: StrategiesService,
    @Inject(forwardRef(() => StrategiesService))
    private readonly slackService: SlackService,
    private readonly configService: ConfigService,
  ) {}

  async validateSettingsAndSendNoti(strategyId: number): Promise<boolean> {
    const foundStrategy = await this.strategiesService.getStrategyById(
      strategyId,
    );

    const { type } = foundStrategy;

    switch (type) {
      case STRATEGY_TYPES.LAND_BORROW_FARM:
        return this.validateLandBorrowFarm(foundStrategy);
      case STRATEGY_TYPES.LAND_BORROW:
        return this.validateLandBorrow(foundStrategy);
      case STRATEGY_TYPES.SWAP_FARM:
        return this.validateSwapFarm(foundStrategy);
    }
  }

  async validateLandBorrowFarm(strategy: StrategyDto): Promise<boolean> {
    const { id: strategyId } = strategy;
    const settings = strategy.settings as LandBorrowFarmSettingsDto;

    const MINUTE_MILLISECONDS = 60_000;

    const {
      adminBalanceCheckTimeoutMilliseconds,
      boostingBalanceCheckTimeoutMilliseconds,
      analyticsTimeoutMilliseconds,
      timeoutMilliseconds,
      claimTimeoutMilliseconds,
      venusClaimTimeoutMilliseconds,
      borrowLimitPercentage,
      borrowLimitPercentageMin,
      borrowLimitPercentageMax,
      claimMinUsd,
      maxBlidRewardsDestribution,
      farmCheckSumInUsd,
      farmMaxDiffPercent,
      minTakeTokenFromStorageEther,
    } = settings;

    const texts = [];

    if (adminBalanceCheckTimeoutMilliseconds < MINUTE_MILLISECONDS) {
      texts.push(
        SLACK_MESSAGES.VLUE_TO_LOW({
          strategyId,
          currentValue: adminBalanceCheckTimeoutMilliseconds,
          needValue: MINUTE_MILLISECONDS,
          valueName: 'adminBalanceCheckTimeoutMilliseconds',
        }),
      );
    }

    if (boostingBalanceCheckTimeoutMilliseconds < MINUTE_MILLISECONDS) {
      texts.push(
        SLACK_MESSAGES.VLUE_TO_LOW({
          strategyId,
          currentValue: boostingBalanceCheckTimeoutMilliseconds,
          needValue: MINUTE_MILLISECONDS,
          valueName: 'boostingBalanceCheckTimeoutMilliseconds',
        }),
      );
    }

    if (analyticsTimeoutMilliseconds < MINUTE_MILLISECONDS) {
      texts.push(
        SLACK_MESSAGES.VLUE_TO_LOW({
          strategyId,
          currentValue: analyticsTimeoutMilliseconds,
          needValue: MINUTE_MILLISECONDS,
          valueName: 'analyticsTimeoutMilliseconds',
        }),
      );
    }

    if (timeoutMilliseconds < MINUTE_MILLISECONDS) {
      texts.push(
        SLACK_MESSAGES.VLUE_TO_LOW({
          strategyId,
          currentValue: timeoutMilliseconds,
          needValue: MINUTE_MILLISECONDS,
          valueName: 'timeoutMilliseconds',
        }),
      );
    }

    if (claimTimeoutMilliseconds < MINUTE_MILLISECONDS) {
      texts.push(
        SLACK_MESSAGES.VLUE_TO_LOW({
          strategyId,
          currentValue: claimTimeoutMilliseconds,
          needValue: MINUTE_MILLISECONDS,
          valueName: 'claimTimeoutMilliseconds',
        }),
      );
    }

    if (venusClaimTimeoutMilliseconds < MINUTE_MILLISECONDS) {
      texts.push(
        SLACK_MESSAGES.VLUE_TO_LOW({
          strategyId,
          currentValue: venusClaimTimeoutMilliseconds,
          needValue: MINUTE_MILLISECONDS,
          valueName: 'venusClaimTimeoutMilliseconds',
        }),
      );
    }

    if (borrowLimitPercentageMax > 0.99) {
      texts.push(
        SLACK_MESSAGES.VALUE_MUST_LESS_THAN({
          strategyId,
          currentValue: borrowLimitPercentageMax,
          lessThanValue: 0.99,
          valueName: 'borrowLimitPercentageMax',
        }),
      );
    }

    if (borrowLimitPercentage > borrowLimitPercentageMax) {
      texts.push(
        SLACK_MESSAGES.VALUE_MUST_LESS_THAN({
          strategyId,
          currentValue: borrowLimitPercentage,
          lessThanValue: borrowLimitPercentageMax,
          valueName: 'borrowLimitPercentage',
        }),
      );
    }

    if (borrowLimitPercentageMin > borrowLimitPercentage) {
      texts.push(
        SLACK_MESSAGES.VALUE_MUST_LESS_THAN({
          strategyId,
          currentValue: borrowLimitPercentageMin,
          lessThanValue: borrowLimitPercentage,
          valueName: 'borrowLimitPercentageMin',
        }),
      );
    }

    if (claimMinUsd <= 0) {
      texts.push(
        SLACK_MESSAGES.VALUE_MUST_GREATER_THAN({
          strategyId,
          currentValue: claimMinUsd,
          greaterThanValue: 0,
          valueName: 'claimMinUsd',
        }),
      );
    }

    if (maxBlidRewardsDestribution <= 0) {
      texts.push(
        SLACK_MESSAGES.VALUE_MUST_GREATER_THAN({
          strategyId,
          currentValue: maxBlidRewardsDestribution,
          greaterThanValue: 0,
          valueName: 'maxBlidRewardsDestribution',
        }),
      );
    }

    if (farmCheckSumInUsd <= 0) {
      texts.push(
        SLACK_MESSAGES.VALUE_MUST_GREATER_THAN({
          strategyId,
          currentValue: farmCheckSumInUsd,
          greaterThanValue: 0,
          valueName: 'farmCheckSumInUsd',
        }),
      );
    }

    if (farmMaxDiffPercent <= 0) {
      texts.push(
        SLACK_MESSAGES.VALUE_MUST_GREATER_THAN({
          strategyId,
          currentValue: farmMaxDiffPercent,
          greaterThanValue: 0,
          valueName: 'farmMaxDiffPercent',
        }),
      );
    }

    if (minTakeTokenFromStorageEther <= 0) {
      texts.push(
        SLACK_MESSAGES.VALUE_MUST_GREATER_THAN({
          strategyId,
          currentValue: minTakeTokenFromStorageEther,
          greaterThanValue: 0,
          valueName: 'minTakeTokenFromStorageEther',
        }),
      );
    }

    if (texts.length > 0) {
      for (const text of texts) {
        if (this.configService.isNotifyToSlackBrockenSettings) {
          await this.slackService.sendMessage({ text });
        } else {
          this.logger.warn({
            message: text,
          });
        }
      }

      return false;
    }

    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validateSwapFarm(strategy: StrategyDto): Promise<boolean> {
    throw new LogicException(ERROR_CODES.NOT_IMPLEMENTED('validateSwapFarm'));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validateLandBorrow(strategy: StrategyDto): Promise<boolean> {
    throw new LogicException(ERROR_CODES.NOT_IMPLEMENTED('validateLandBorrow'));
  }
}
