import type { WARNING_CODE_ITEM } from './constants/warning-codes';

export class LogicWarning {
  message: string;

  text: string;

  constructor(errorCodeItem: WARNING_CODE_ITEM) {
    this.message = errorCodeItem.code;
    this.text = errorCodeItem.text;
  }
}
