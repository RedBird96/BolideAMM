/* eslint-disable @typescript-eslint/ban-ts-comment */
import TestRunner from 'jest-runner';

class SerialRunner extends TestRunner {
  constructor(...attr) {
    // @ts-expect-error
    super(...attr);
    // @ts-ignore
    this.isSerial = true;
  }
}

module.exports = SerialRunner;
