import { Logger } from '@nestjs/common';

const logger = new Logger('SLEEP');

export const sleep = (waitTimeInMs) => {
  logger.debug(`WAIT (ms): ${waitTimeInMs}`);

  return new Promise((resolve) => setTimeout(resolve, waitTimeInMs));
};
