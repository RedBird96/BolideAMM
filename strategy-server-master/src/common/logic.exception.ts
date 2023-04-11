import { BadRequestException } from '@nestjs/common';
import type { ERROR_CODE_ITEM } from 'src/common/constants/error-codes';

export class LogicException extends BadRequestException {
  constructor(errorCodeItem: ERROR_CODE_ITEM) {
    super({
      messages: [errorCodeItem],
    });
  }
}
