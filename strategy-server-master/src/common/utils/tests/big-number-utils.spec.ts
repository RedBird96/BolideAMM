import { fromWeiToStr, toBN, toWei } from '../big-number-utils';

describe('BigNumberUtilstests', () => {
  describe('toBN tests', () => {
    it('check 18.805_404_736_195_605_257', () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        const bn = toBN('18.805404736195605257');
        expect(bn).toBeDefined();
      } catch (error) {
        expect(error).toBeUndefined();
      }
    });
  });

  describe('toWei tests', () => {
    it('check 18.805_404_736_195_605_257', () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        const bn = toBN('18.805404736195605257');

        const wei = toWei(bn);

        expect(wei).toBeDefined();
      } catch (error) {
        expect(error).toBeUndefined();
      }
    });

    it('check "49.19954054322079984491"', () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        const bn = toBN('49.19954054322079984491');

        const wei = toWei(bn);

        expect(wei).toBeDefined();
      } catch (error) {
        expect(error).toBeUndefined();
      }
    });
  });

  describe('fromWeiToStr tests', () => {
    it('check 2.289427854607005366', () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
        const bn = toBN('2.289427854607005366');

        const str = fromWeiToStr(bn);

        expect(str).toBe('0.000000000000000002');
      } catch (error) {
        expect(error).toBeUndefined();
      }
    });
  });

  describe('check invalud BN args', () => {
    const arr = [null, undefined, '', 0];

    for (const el of arr) {
      it(`${el} should be a 0`, () => {
        try {
          expect(toBN(el).toString()).toBe('0');
        } catch (error) {
          expect(error).toBeUndefined();
        }
      });
    }
  });
});
