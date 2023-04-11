export const SLACK_MESSAGES = {
  RESTART_APP: (data: { env: string; pid: number }) => `
    Nest App (strategy-server) was restarted (${data.env})!
  `,

  VLUE_TO_LOW: (data: {
    strategyId: number;
    currentValue: number;
    needValue: number;
    valueName: string;
  }) => {
    const { strategyId, currentValue, needValue, valueName } = data;

    return `Слишком малое значение параметра ${valueName} - ${currentValue} в стратегии ${strategyId}, может привести к проблемам на сервере. Нужно установить больше ${needValue}`;
  },

  VALUE_MUST_LESS_THAN: (data: {
    strategyId: number;
    currentValue: number;
    lessThanValue: number;
    valueName: string;
  }) => {
    const { strategyId, currentValue, lessThanValue, valueName } = data;

    return `Значение параметра ${valueName} - ${currentValue} в стратегии ${strategyId}, должнол быть меньше, чем ${lessThanValue}`;
  },

  VALUE_MUST_GREATER_THAN: (data: {
    strategyId: number;
    currentValue: number;
    greaterThanValue: number;
    valueName: string;
  }) => {
    const { strategyId, currentValue, greaterThanValue, valueName } = data;

    return `Значение параметра ${valueName} - ${currentValue} в стратегии ${strategyId}, должнол быть больше, чем ${greaterThanValue}`;
  },
};
