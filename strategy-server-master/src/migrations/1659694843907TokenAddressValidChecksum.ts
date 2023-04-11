import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { ContractEntity } from 'src/modules/contracts/contract.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

import { mainnetTokens } from './data/seeds/tokens';

export class TokenAddressValidChecksum1659694843907
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tokens = await queryRunner.manager.find(ContractEntity, {
      blockchainId: 1,
      type: CONTRACT_TYPES.TOKEN,
    });

    const validChecksumTokens = Object.values(mainnetTokens);

    for (const dbToken of tokens) {
      const token = dbToken.toDto();

      for (const validChecksumToken of validChecksumTokens) {
        if (
          dbToken.address.toLowerCase() ===
          validChecksumToken.address.toLowerCase()
        ) {
          await queryRunner.manager.update(
            ContractEntity,
            {
              id: token.id,
            },
            {
              address: validChecksumToken.address,
            },
          );
        }
      }
    }
  }

  public async down(): Promise<void> {
    void null;
  }
}
// BNB,0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
// USDT,0x55d398326f99059ff775485246999027b3197955
// BUSD,0xe9e7cea3dedca5984780bafc599bd69add087d56
// USDC,0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d
// SXP,0x47BEAd2563dCBf3bF2c9407fEa4dC236fAbA485A
// XVS,0xcf6bb5389c92bdda8a3747ddb454cb7a64626c63
// ETH,0x2170ed0880ac9a755fd29b2688956bd959f933f8
// DAI,0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3
// FIL,0x0d8ce2a99bb6e3b7db580ed848240e4a0f9ae153
// CAKE,0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82
// ADA,0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47
// DOGE,0xbA2aE424d960c26247Dd6c32edC70B295c744C43
// LTC,0x4338665CBB7B2485A8855A139b75D5e34AB0DB94
// BCH,0x8fF795a6F4D97E7887C79beA79aba5cc76444aDf
// DOT,0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402
// TRX,0x85EAC5Ac2F758618dFa09bDbe0cf174e7d574D5B
// LINK,0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD
// BTC,0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c
// XRP,0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE
// BSW,0x965f527d9159dce6288a2219db51fc6eef120dd1
