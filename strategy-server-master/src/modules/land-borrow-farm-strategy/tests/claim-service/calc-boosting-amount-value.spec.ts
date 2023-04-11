import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { ClaimService } from '../../claim.service';

describe('calcBoostingAmountValue', () => {
  let app: TestingModule;
  let claimService: ClaimService;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      imports: [],
      controllers: [],
      providers: [ClaimService],
    })
      .useMocker(() => ({}))
      .compile();

    claimService = app.get<ClaimService>(ClaimService);
  });

  describe('calcBoostingAmountValue tests', () => {
    it('результат не должен содержать .', () => {
      const QUANTITY_TOKENS_IN_BLOCK = 0.000_000_01;

      const amount = QUANTITY_TOKENS_IN_BLOCK * 36_785;

      const result = claimService.calcBoostingAmountValue(amount);

      expect(result).toBe('367850000000000');
    });

    it('результат не должен содержать . (ошибка из-за большого числа токенов на блок)', () => {
      const QUANTITY_TOKENS_IN_BLOCK = 0.033_575_073_87;

      const amount = QUANTITY_TOKENS_IN_BLOCK * 36_785;

      const result = claimService.calcBoostingAmountValue(amount);

      expect(result).toBe('1235059092307950000000');
    });
  });
});
