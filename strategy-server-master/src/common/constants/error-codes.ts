import type { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';

import type { PLATFORMS } from './platforms';

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface ERROR_CODE_ITEM {
  code: string;
  text: string;
}

export const ERROR_CODES = {
  UNKNOWN: {
    code: 'unknown',
    text: 'неизвестная ошибка',
  },

  INVALID_DATA_FOR_CALC: {
    code: 'invalid_data_for_calc',
    text: 'неверные или нет данных для расчета',
  },

  BLOCKCHAIN_GET_BALANCE_ERROR: {
    code: 'blockchain_get_balance_error',
    text: 'ошибка вызова метода getBalance',
  },

  NOT_IMPLEMENTED: (method: string) => ({
    code: 'not_implemented',
    text: `не реализован метод ${method}`,
  }),

  IS_VALUE_UNDEFINED: (data: { value: string }) => ({
    code: 'is_value_undefined',
    text: `ожидалось значение, но оно undefined ${data.value}`,
  }),

  MULTICALL_RESULT_ERROR: {
    code: 'multicall_result_error',
    text: 'multicall is not success',
  },

  PG: {
    code: 'pg',
    text: 'ошибка при запросе в postgres',
  },

  VALIDATION: {
    code: 'validation',
    text: 'ошибка при валидации данных',
  },

  AUTH: {
    code: 'auth',
    text: 'ошибка авторизации',
  },

  NO_ACCESS: {
    code: 'no_access',
    text: 'нет прав для доступа к ресурсу',
  },

  NOT_FORMATTED: {
    code: 'not_formatted',
    text: 'обработанная ошибка, но неотформатированная к стандарту',
  },

  UNHANDLED: {
    code: 'unhandled',
    text: 'необработанная ошибка',
  },

  NOT_FOUND: {
    code: 'not_found',
    text: 'не найдено',
  },

  NOT_FOUND_ACCOUNT: {
    code: 'not_found_account',
    text: 'не найден аккаунт',
  },

  NOT_FOUND_FARM: {
    code: 'not_found_farm',
    text: 'не найдена farm по имени пары и market',
  },

  INVALID_PASSWORD: {
    code: 'invalid_password',
    text: 'неверный пароль',
  },

  TX_STATUS_FAILED: (data: { txHash: string; uid: string }) => ({
    code: 'tx_status_failed',
    text: `Failed status for tx ${data.txHash} uid ${data.uid}`,
  }),

  TX_ERROR_LOGS_FAILED: (data: { txHash: string; uid: string }) => ({
    code: 'tx_error_logs_failed',
    text: `Transaction ${data.txHash} because of event errors uid ${data.uid}`,
  }),

  TX_WAITING_TIMEOUT: (data: { txHash: string; uid: string }) => ({
    code: 'tx_waiting_timeout',
    text: `Waiting timeout for tx ${data.txHash} ${data.uid}`,
  }),

  RATE_IS_UNDEFINED_FOR_ASSET: (data: { asset: string; results: any }) => ({
    code: 'rate_is_undefined_for_asset',
    text: `${data.asset}, results ${JSON.stringify(data.results, null, 4)}`,
  }),

  LOCKED_STRATEGY: (data: { count: number }) => ({
    code: 'strategy_already_running',
    text: `Strategy is locked, success strategy cycle count: ${data.count}`,
  }),

  INACTIVE_STRATEGY: {
    code: 'strategy_inactive',
    text: 'Strategy is inactive',
  },

  UNISWAP_POOL_DATA_RESPONSE_ERROR: {
    code: 'uniswap_pool_data_response_error',
    text: 'ошибка при получении данных о pool на uniswap',
  },

  THE_GRAPH_RESPONSE_ERROR: {
    code: 'the_graph_response_error',
    text: 'ошибка получения данные от thegraph',
  },

  TX_LOGS_ERROR: {
    code: 'tx_logs_error',
    text: 'в транзакции нету logs, хотя они ожидались',
  },

  NOT_FOUND_TELEGRAM_SETTINGS: {
    code: 'not_found_telegram_settings',
    text: 'не найдены настройки для telegram',
  },

  NOT_FOUND_TG_TARGET_GROUP_ID: {
    code: 'not_found_tg_target_group_id',
    text: 'не найдена целевая группа для бота',
  },

  NOT_FOUND_OPERATION: {
    code: 'NOT_FOUND_OPERATION',
    text: 'не найдена операция',
  },

  OPERATION_IN_PROGRESS_EXIST: {
    code: 'operation_in_progress_exist',
    text: 'есть уже запущенная операция, дождитесь окончания работы',
  },

  OPERATION_IN_PENDING_EXIST: {
    code: 'operation_in_pending_exist',
    text: 'уже есть операция, которая ожидает выполнения',
  },

  LAST_OPERATION_IS_NOT_SUCCESS: {
    code: 'last_operation_is_not_success',
    text: 'последняя операция по стратегии завершилась ошибкой',
  },

  NOT_FOUND_STRATEGY: {
    code: 'not_found_strategy',
    text: 'не найдена стратегия',
  },

  NOT_FOUND_STRATEGY_TYPE: {
    code: 'not_found_strategy_type',
    text: 'не найден тип стратегии',
  },

  NOT_FOUND_BLOCKCHAIN: {
    code: 'not_found_blockchain',
    text: 'не найден блокчейн',
  },

  NOT_FOUND_PAIR: {
    code: 'not_found_pair',
    text: 'не найдена пара токенов',
  },

  NOT_FOUND_STRATEGY_PAIR: {
    code: 'not_found_strategy_pair',
    text: 'не найдена связь стратегия_пара токенов',
  },

  STRATEGY_PAIR_INCORRECT_PERCENTAGE: {
    code: 'strategy_pair_incorrect_percentage',
    text: 'сумма процентов пар стратегии превышает 100%',
  },

  SETTINGS_SETTINGS_INVALID: {
    code: 'settings_settings_invalid',
    text: 'неправильные настройки стратегии',
  },

  VENUS_API_ERROR: {
    code: 'venus_api_error',
    text: 'ошибка при обращении к API venus',
  },

  VENUS_BATCH_CONTRACTS_ERROR: {
    code: 'venus_batch_contracts_error',
    text: 'ошибка при обращении к контрактам venus',
  },

  VENUS_CALC_COMPUTE_APY_ERROR: {
    code: 'venus_calc_compute_apy_error',
    text: 'ошибка при расчетах apy',
  },

  VENUS_CALC_PERCENT_LIMIT_ERROR: {
    code: 'venus_calc_percent_limit_error',
    text: 'ошибка при расчетах процента займа стратегии',
  },

  NOT_EXIST_PROFITABLE_PATH: (data: {
    asset: string;
    assetTo: string;
    amount: number;
  }) => ({
    code: 'DEXAggregatorService_getProfitPath',
    text: `Нет выгодных путей для ${data.asset} => ${data.assetTo} на сумму ${data.amount}`,
  }),

  STRATEGY_STILL_HAS_DEBTS: {
    code: 'strategy_still_has_debts',
    text: 'у стратегии все еще есть долги',
  },

  STRATEGY_DELETE_IS_ACTIVE: {
    code: 'strategy_is_active',
    text: 'нельзя удалить активную стратегию',
  },
  STRATEGY_DELETE_OPERATIONS: {
    code: 'strategy_delete_operations',
    text: 'нельзя удалить стратегию у которой есть операции',
  },

  NOT_FOUND_CONTRACT_BY_ID: {
    code: 'not_found_contract',
    text: 'не найден контракт id',
  },

  NOT_FOUND_CONTRACT: (data: {
    blockchainId: number;
    platform: PLATFORMS;
    type: CONTRACT_TYPES;
  }) => ({
    code: 'not_found_contract',
    text: `не найден контракт ${data.type} платформы ${data.platform} блокчейна ${data.blockchainId}`,
  }),

  NOT_FOUND_STORAGE: {
    code: 'not_found_storage',
    text: 'не найдено storage',
  },

  STRATEGY_CONTRACT_TYPE_MISTMATCH: {
    code: 'strategy_contract_type_mistmatch',
    text: 'тип контракта для стратегии не соответствует нужному',
  },

  STRATEGY_NOT_SET_OPERATIONS_KEY: {
    code: 'strategy_not_set_operations_key',
    text: 'стратегии не назначени приватный ключ для операций',
  },

  STRATEGY_NOT_SET_BOOSTING_KEY: {
    code: 'strategy_not_set_boosting_key',
    text: 'стратегии не назначени приватный ключ для бустинга',
  },

  RUNTIME_KEY_DELETE_STRATEGY_IS_ACTIVE: {
    code: 'runtime_key_delete_strategy_is_active',
    text: 'нельзя удалить ключ, у которого есть активная стратегия',
  },

  NOT_FOUND_RUNTIME_KEY: (id: number) => ({
    code: 'not_found_runtime_key',
    text: `не найден в базе данных ключ по id ${id}`,
  }),

  RUNTIME_KEY_VALUE_IS_NIL: (key: string) => ({
    code: 'runtime_key_value_is_nil',
    text: `значение для ${key} не установлено`,
  }),

  NOT_ENOUGH_ALLOWANCE: (data: { owner: string; spender: string }) => ({
    code: 'not_enough_allowance',
    text: `Allowance ниже нужного уровня: owner ${data.owner}, spender: ${data.spender}`,
  }),

  NO_APPROVED_TOKENS_IN_STORAGE_CONTRACT: {
    code: 'no_approved_tokens_in_storage_contract',
    text: 'no approved tokens in storage contract',
  },

  NO_ADDRESSES: {
    code: 'no_addresses',
    text: 'no addresses',
  },

  BORROW_LIMIT_PERCENTAGE_UNDEFINED: (data: { strategyId: number }) => ({
    code: 'borrow_limit_percentage_undefined',
    text: `Для стратегии id = ${data.strategyId} не выставлена настройка borrowLimitPercentage`,
  }),

  DEX_AGGREGATOR: {
    TRADES_NOT_DEFINED: {
      code: 'trades_not_defined',
      text: 'no addresses',
    },
    TRADES_NOT_COMPARABLE: {
      code: 'trades_not_comparable',
      text: 'Trades are not comparable',
    },
    INVALID_TOKEN_TRADE: (symbol: string) => ({
      code: 'invalid_token_trade',
      text: `Invalid token ${symbol} executing getTokenBySymbol`,
    }),
  },
};
