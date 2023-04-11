import { LandBorrowFarmSettingsDto } from 'src/modules/land-borrow-farm-strategy/dto/LandBorrowFarmSettingsDto';

const settings = new LandBorrowFarmSettingsDto();

settings.isStrategyChangeNotify = false;
settings.adminMinBnbBalance = 0.2;
settings.isAdminBalanceCronEnabled = false;
settings.isAnalyticsCronEnabled = false;
settings.isBnbBorrowLimitCronEnabled = true;
settings.isAutostartEnabled = false;
settings.isClaimAutostartEnabled = false;
settings.timeoutMilliseconds = 60_000;
settings.claimTimeoutMilliseconds = 4 * 3_600_000; // 4 hours
settings.quantityTokensInBlock = 0;
settings.borrowLimitPercentage = 0.92;
settings.borrowLimitPercentageMin = 0.88;
settings.borrowLimitPercentageMax = 0.96;
settings.claimMinUsd = 0.96;
settings.maxBlidRewardsDestribution = 1;
settings.farmCheckSumInUsd = 100;
settings.farmMaxDiffPercent = 2;
settings.isClaimVenus = false;
settings.isClaimFarms = true;
settings.isClaimLended = false;
settings.venusClaimTimeoutMilliseconds = 86_400_000;
settings.isVenusClaimAutostartEnabled = false;
settings.isFailedDistributeNotification = true;
settings.isDistributeIfNegativeBalance = false;

export { settings };
