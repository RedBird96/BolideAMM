import stdSerializers from 'pino-std-serializers';
import type { StrategyDto } from 'src/modules/strategies/dto/StrategyDto';

import { COMMANDS } from '../../modules/telegram/constants/commands';
import type { LogicException } from '../logic.exception';
import type { PLATFORMS } from './platforms';

export const COMMANDS_DESCS = {
  COMMAND_START: 'Hello and welcome!',
  COMMAND_HELP: 'About bot functions.',
};

export const TG_MESSAGES = {
  START: `
    Hello and Welcome!👋
  `,

  COMMAND_ADMIN_BIND_TARGET_GROUP: `${COMMANDS.ADMIN_BIND_TARGET_GROUP} - bind target group (admin only)`,

  UNKNOWN_COMMAND: `Unknown command. Try ${COMMANDS.START}`,

  SUCCESS: 'Action successful',

  HELLO_OWNER: `Hello, new owner. I will bind me to the group via ${COMMANDS.ADMIN_BIND_TARGET_GROUP}`,

  BNB_BORROW_COST_CHANGE: (data: {
    borrowApy: string | number;
    platform: PLATFORMS;
  }) => `Изменилась стоимость займа BNB на ${data.platform}: ${data.borrowApy}`,

  BORROW_LIMIT_MAX: (data: { max: number; current: number }) =>
    `Превышено значение максимального займа ${data.max} текущее ${data.current}`,

  ADMIN_BNB_BALANCE_TO_LOW: (data: {
    currentBalance: string;
    minBalance: string;
    adminWalletAddress: string;
  }) =>
    `Остаток BNB на кошельке администратора слишком мал: <b>${data.currentBalance}</b>. Необходимый минимум: ${data.minBalance}. Адрес администратора ${data.adminWalletAddress}`,

  ADMIN_BNB_BALANCE_FINE: (data: {
    currentBalance: string;
    adminWalletAddress: string;
  }) =>
    `Остаток BNB на кошельке администратора в норме: <b>${data.currentBalance}</b>. Адрес администратора ${data.adminWalletAddress}`,

  BOOSTING_BLID_BALANCE_TO_LOW: (data: {
    boostingBalance: number;
    needBalance: number;
    boostingWalletAddress: string;
  }) =>
    `Остаток BLID на кошельке для бустинга слишком мал: <b>${data.boostingBalance}</b>. Необходимо для бустинга: ${data.needBalance}. Адрес администратора ${data.boostingWalletAddress}`,

  MONITORING_PAIRS_RATIO_CHANGE: (data: {
    pairName: string;
    percentDiff: number;
    tokensPrice: string;
  }) =>
    `В паре ${data.pairName} соотношение цен токенов изменилось на <b>${data.percentDiff}%</b>. Новая цена: ${data.tokensPrice}`,
  DEBT_WARNING: (data: {
    preMsg: string;
    tokenName: string;
    diff: string;
    uid: string;
  }) =>
    `${data.preMsg} по токену ${data.tokenName} в размере <b>${Number(
      data.diff,
    ).toFixed(5)} BNB</b>, operation_id ${data.uid}`,

  TRANSFER_LEDNED_TO_STORAGE: (data: {
    amount: string;
    token: string;
    uid: string;
  }) =>
    `Ошибка при выводе lended ${data.amount} ${data.token}, operation_id ${data.uid}`,

  MIN_BLID_USD_BALANCE: (data: {
    currentBlidBalanceUsd: string;
    minBlidBalanceUsd: string;
  }) =>
    `На кошельке для оплаты стейкинга значение баланса меньше минимального! Текущее: ${data.currentBlidBalanceUsd}, минимальное: ${data.minBlidBalanceUsd}`,

  STRATEGY_CHANGE_STATUS: (data: { strategyName: string; isActive: boolean }) =>
    `Стратегия "${data.strategyName}" стала ${
      data.isActive ? 'активной' : 'неактивной'
    }!`,

  STRATEGY_CHANGED: (data: { strategyName: string; changes: any }) =>
    `У стратеги "${
      data.strategyName
    }" изменились следующие свойства ${JSON.stringify(
      data.changes,
    )}. Стратегия стала неактивной!`,

  STRATEGY_ADD_PAIR: (data: { strategyName: string; pairName: string }) =>
    `К стратегии "${data.strategyName}" добавлена пара ${data.pairName}`,

  STRATEGY_UPDATE_PAIR: (data: { strategyName: string; pairName: string }) =>
    `В стратегии "${data.strategyName}" обновлена пара ${data.pairName}`,

  STRATEGY_DELETE_PAIR: (data: { strategyName: string; pairName: string }) =>
    `В стратегии "${data.strategyName}" удалена пара ${data.pairName}. Стратегия стала неактивной!`,

  LP_CONTRACT_ADDED: (data: { pairName: string; platform: PLATFORMS }) =>
    `На платфоме "${data.platform}" появилась новая пара ${data.pairName}`,

  LP_CONTRACT_DELETED: (data: {
    pairName: string;
    platform: PLATFORMS;
    strategies: StrategyDto[];
  }) => {
    const strategiesMsgs = data.strategies.map(
      (strategy) => `${strategy.name} (${strategy.id})`,
    );

    return `Pair "${data.pairName}" has been removed from "${
      data.platform
    }" platform. The pair is used by the following strategies: ${strategiesMsgs.join()}`;
  },

  NOT_DISTRIBUTE: ({
    uid,
    limit,
    available,
  }: {
    uid: string;
    limit: string;
    available: string;
  }) => `Не прошло распределение ${available}(лимит ${limit}), ${uid}`,

  DISTRIBUTE_FAILED: ({
    error,
    operationId,
  }: {
    error: LogicException | Error;
    operationId: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore skip
    const resp = error.response;
    const errMsg = resp
      ? JSON.stringify(resp)
      : stdSerializers.err(error).stack;

    return `Ошибка во время распределения ${operationId} ${errMsg}`;
  },

  NEGATIVE_BALANCE: ({
    amount,
    strategyId,
    operationId,
  }: {
    amount: number;
    strategyId: number;
    operationId: string;
  }) =>
    `Strategy ${strategyId} has negative blanace ${amount} during claiming execution ${operationId}`,
};
