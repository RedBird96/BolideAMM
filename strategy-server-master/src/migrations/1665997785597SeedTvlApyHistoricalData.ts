import Decimal from 'decimal.js';
import { DateTime } from 'luxon';
import { BLOCKCHAIN_NAMES } from 'src/common/constants/blockchain-names';
import { BlockchainEntity } from 'src/modules/blockchains/blockchain.entity';
import { ApyHistoryEntity } from 'src/modules/bnb/apy/apy-history.entity';
import type { ApyHistoryStrategyDataDto } from 'src/modules/bnb/apy/dto/ApyHistoryStrategyDataDto';
import type { TvlHistoryStrategyDataDto } from 'src/modules/bnb/tvl/dto/TvlHistoryStrategyDataDto';
import { TvlHistoryEntity } from 'src/modules/bnb/tvl/tvl-history.entity';
import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { TOKEN_NAMES } from 'src/modules/contracts/constants/token-names';
import { ContractEntity } from 'src/modules/contracts/contract.entity';
import { StrategyEntity } from 'src/modules/strategies/strategy.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

import { apy as btcApyList } from './data/seeds/apy/btc';
import { apy as ethApyList } from './data/seeds/apy/eth';
import { apy as stablecoinsApyList } from './data/seeds/apy/stable-coins';
import { tvl as btcTvlList } from './data/seeds/tvl/btc';
import { tvl as ethTvlList } from './data/seeds/tvl/eth';
import { tvl as farmingTvlList } from './data/seeds/tvl/farming';
import { tvl as stablecoinsTvlList } from './data/seeds/tvl/stable-coins';
import { tvl as stakingTvlList } from './data/seeds/tvl/staking';

interface DateValue {
  date: string;
  value: number;
}

export class SeedTvlApyHistoricalData1665997785597
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const dateOfFakeDataTagRelease = '2022-10-15';
    await queryRunner.manager.query(
      `DELETE FROM "tvl_history" WHERE "created_at" < '${dateOfFakeDataTagRelease}'`,
    );
    await queryRunner.manager.query(
      `DELETE FROM "apy_history" WHERE "created_at" < '${dateOfFakeDataTagRelease}'`,
    );

    const { id: blockchainId } = await queryRunner.manager.findOneOrFail(
      BlockchainEntity,
      { name: BLOCKCHAIN_NAMES.BNB },
    );

    const {
      storageContract: stableCoinsStorage,
      strategy: stableCoinsStrategy,
    } = await this.getStrategyAndStorageByVaultTokenName(
      queryRunner,
      TOKEN_NAMES.USDT,
    );
    const { storageContract: btcStorage, strategy: btcStrategy } =
      await this.getStrategyAndStorageByVaultTokenName(
        queryRunner,
        TOKEN_NAMES.BTC,
      );
    const { storageContract: ethStorage, strategy: ethStrategy } =
      await this.getStrategyAndStorageByVaultTokenName(
        queryRunner,
        TOKEN_NAMES.ETH,
      );

    const mapStableTvl = this.dataListToMap(stablecoinsTvlList);
    const mapEthTvl = this.dataListToMap(ethTvlList);
    const mapBtcTvl = this.dataListToMap(btcTvlList);
    const mapFarmingTvl = this.dataListToMap(farmingTvlList);
    const mapStakingTvl = this.dataListToMap(stakingTvlList);

    for (const [dateStr, value] of mapStableTvl) {
      const btcTvl = mapBtcTvl.get(dateStr);
      const ethTvl = mapEthTvl.get(dateStr);
      const farmingTvl = mapFarmingTvl.get(dateStr) || 0;
      const stakingTvl = mapStakingTvl.get(dateStr) || 0;

      let totalTvl = new Decimal(value);

      const date = DateTime.fromISO(dateStr).toJSDate();

      const strategiesTvlData: TvlHistoryStrategyDataDto[] = [];
      strategiesTvlData.push({
        strategyId: stableCoinsStrategy.id,
        contractAddress: stableCoinsStorage.address,
        totalStrategyTvl: value,
        tokensTvl: {},
      });

      if (btcStorage && btcStrategy && btcTvl) {
        totalTvl = totalTvl.add(btcTvl);
        strategiesTvlData.push({
          strategyId: btcStrategy.id,
          contractAddress: btcStorage.address,
          totalStrategyTvl: btcTvl,
          tokensTvl: {},
        });
      }

      if (ethStorage && ethStrategy && ethTvl) {
        totalTvl = totalTvl.add(ethTvl);
        strategiesTvlData.push({
          strategyId: ethStrategy.id,
          contractAddress: ethStorage.address,
          totalStrategyTvl: ethTvl,
          tokensTvl: {},
        });
      }

      if (farmingTvl) {
        totalTvl = totalTvl.add(farmingTvl);
      }

      if (stakingTvl) {
        totalTvl = totalTvl.add(stakingTvl);
      }

      const count = await queryRunner.manager.count(TvlHistoryEntity, { date });

      if (count === 0) {
        await queryRunner.manager.save(TvlHistoryEntity, {
          date,
          blockchainId,
          farmingTvl,
          stakingTvl,
          strategiesTvlData,
          totalTvl: totalTvl.toNumber(),
        });
      }
    }

    const mapStableApy = this.dataListToMap(stablecoinsApyList);
    const mapEthApy = this.dataListToMap(ethApyList);
    const mapBtcApy = this.dataListToMap(btcApyList);

    for (const [dateStr, value] of mapStableApy) {
      const btcApy = mapBtcApy.get(dateStr);
      const ethApy = mapEthApy.get(dateStr);

      const date = DateTime.fromISO(dateStr).toJSDate();

      const strategiesApyData: ApyHistoryStrategyDataDto[] = [];
      strategiesApyData.push({
        strategyId: stableCoinsStrategy.id,
        contractAddress: stableCoinsStorage.address,
        strategyApy: value,
      });

      if (btcStorage && btcStrategy && btcApy) {
        strategiesApyData.push({
          strategyId: btcStrategy.id,
          contractAddress: btcStorage.address,
          strategyApy: btcApy,
        });
      }

      if (ethStorage && ethStrategy && ethApy) {
        strategiesApyData.push({
          strategyId: ethStrategy.id,
          contractAddress: ethStorage.address,
          strategyApy: ethApy,
        });
      }

      const count = await queryRunner.manager.count(ApyHistoryEntity, { date });

      if (count === 0) {
        await queryRunner.manager.save(ApyHistoryEntity, {
          date,
          blockchainId,
          strategiesApyData,
        });
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const lastDateOfImportedData = '2022-10-17';
    await queryRunner.manager.query(
      `DELETE FROM "tvl_history" WHERE "date" < '${lastDateOfImportedData}'`,
    );
    await queryRunner.manager.query(
      `DELETE FROM "apy_history" WHERE "date" < '${lastDateOfImportedData}'`,
    );
  }

  private dataListToMap(list: DateValue[]): Map<string, number> {
    const map = new Map<string, number>();

    list = list.map((item) => ({
      date: DateTime.fromFormat(item.date, 'dd.MM.yyyy').toISO(),
      value: item.value,
    }));

    list.sort((a, b) => (a.date > b.date ? 1 : -1));

    for (const [i, item] of list.entries()) {
      if (i > 0) {
        const prevItem = list[i - 1];

        const prevDate = DateTime.fromISO(prevItem.date);
        const currDate = DateTime.fromISO(item.date);

        let date = prevDate.plus({ days: 1 });

        // fill gaps between dates
        while (date < currDate) {
          map.set(date.toISO(), prevItem.value);

          date = date.plus({ days: 1 });
        }
      }

      map.set(item.date, item.value);
    }

    return map;
  }

  private async getStrategyAndStorageByVaultTokenName(
    queryRunner: QueryRunner,
    tokenName: TOKEN_NAMES,
  ): Promise<{
    storageContract: ContractEntity;
    strategy: StrategyEntity;
  }> {
    const token = await queryRunner.manager.findOneOrFail(ContractEntity, {
      name: tokenName,
    });

    const storageContract = await this.getStorageContractByApprovedTokenAddress(
      queryRunner,
      token.address,
    );

    if (!storageContract) {
      return {
        storageContract,
        strategy: null,
      };
    }

    const strategy = await queryRunner.manager.findOne(StrategyEntity, {
      storageContractId: storageContract.id,
    });

    return {
      storageContract,
      strategy,
    };
  }

  private async getStorageContractByApprovedTokenAddress(
    queryRunner: QueryRunner,
    tokenAddress: string,
  ): Promise<ContractEntity> {
    const qb = queryRunner.manager
      .createQueryBuilder(ContractEntity, 'contracts')
      .where({
        type: CONTRACT_TYPES.STR_STORAGE,
      })
      .andWhere(
        `lower(data::text)::jsonb->'approvedtokens' @> '["${tokenAddress.toLowerCase()}"]'`,
      );

    return qb.getOne();
  }
}
