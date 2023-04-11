// eslint-disable-next-line @typescript-eslint/naming-convention
export interface WARNING_CODE_ITEM {
  code: string;
  text: string;
}

export const WARNING_CODES = {
  NOT_EXIST_PROFITABLE_PATH: (data: {
    asset: string;
    assetTo: string;
    amount: number;
  }) => ({
    code: 'DEXAggregatorService_getProfitPath',
    text: `Нет выгодных путей для ${data.asset} => ${data.assetTo} на сумму ${data.amount}`,
  }),
};
