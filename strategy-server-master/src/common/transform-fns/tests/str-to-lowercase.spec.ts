import type { TransformFnParams } from 'class-transformer';

import { strToLowercase } from '../str-to-lowercase';

describe('тест str to lowercase', () => {
  it('должна возвращать строку в lowercase', () => {
    const testStr = 'TEST';

    expect(strToLowercase({ value: testStr } as TransformFnParams)).toBe(
      'test',
    );
  });

  it('должна возвращать строку в lowercase при разном case', () => {
    const testStr = 'TEst';

    expect(strToLowercase({ value: testStr } as TransformFnParams)).toBe(
      'test',
    );
  });

  it('должна возвращать строку в lowercase если цифры или спецсимволы', () => {
    const testStr = 'TE12+';

    expect(strToLowercase({ value: testStr } as TransformFnParams)).toBe(
      'te12+',
    );
  });

  it('должна возвращать null', () => {
    const testStr = null;

    expect(strToLowercase({ value: testStr } as TransformFnParams)).toBe(null);
  });

  it('должна возвращать undefined', () => {
    const testStr = undefined;

    expect(
      strToLowercase({ value: testStr } as TransformFnParams),
    ).toBeUndefined();
  });
});
