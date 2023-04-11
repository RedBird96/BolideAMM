import { HttpService } from '@nestjs/axios';
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { ConfigService } from 'src/shared/services/config.service';

import { VaultService } from './vault.service';

const plaintext = 'A plain text';
const plaintextBase64 = Buffer.from(plaintext).toString('base64');

const encryptResponse = {
  data: {
    ciphertext: plaintextBase64,
  },
};

const decryptResponse = {
  data: {
    plaintext: plaintextBase64,
  },
};

const mockResponse = (url: string) => {
  const data = url.includes('encrypt') ? encryptResponse : decryptResponse;

  return {
    data,
    headers: {},
    config: { url: 'http://vault' },
    status: 200,
    statusText: 'OK',
  };
};

describe('The VaultService', () => {
  let vaultService: VaultService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [],
      providers: [
        VaultService,
        ConfigService,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn((url) => of(mockResponse(url))),
          },
        },
      ],
    })
      .useMocker(() => ({}))
      .compile();

    vaultService = module.get<VaultService>(VaultService);
  });

  describe('test', () => {
    it('test', async () => {
      expect(vaultService).toBeDefined();
    });
  });
});
