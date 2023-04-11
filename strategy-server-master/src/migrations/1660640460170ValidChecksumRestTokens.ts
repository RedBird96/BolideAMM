import { CONTRACT_TYPES } from 'src/modules/contracts/constants/contract-types';
import { ContractEntity } from 'src/modules/contracts/contract.entity';
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ValidChecksumRestTokens1660640460170
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const validCheckSumTokens = [
      { name: 'BANANA', address: '0x603c7f932ED1fc6575303D8Fb018fDCBb0f39a95' },
      { name: 'MATIC', address: '0xCC42724C6683B7E57334c4E856f4c9965ED682bD' },
      { name: 'CSRT', address: '0x32Ee7c89D689CE87cB3419fD0F184dc6881Ab3C7' },
      { name: 'BLID', address: '0x766AFcf83Fd5eaf884B3d529b432CA27A6d84617' },
    ];

    const tokens = await queryRunner.manager.find(ContractEntity, {
      blockchainId: 1,
      type: CONTRACT_TYPES.TOKEN,
    });

    for (const dbToken of tokens) {
      const token = dbToken.toDto();

      for (const validChecksumToken of validCheckSumTokens) {
        if (
          dbToken.address.toLowerCase() ===
          validChecksumToken.address.toLowerCase()
        ) {
          await queryRunner.manager.update(
            ContractEntity,
            { id: token.id },
            { address: validChecksumToken.address },
          );
        }
      }
    }

    const vTokens = await queryRunner.manager.find(ContractEntity, {
      blockchainId: 1,
      type: CONTRACT_TYPES.INNER_TOKEN,
    });

    for (const dbToken of vTokens) {
      const token = dbToken.toDto();

      for (const validChecksumToken of validCheckSumTokens) {
        if (
          token.data.baseContractAddress.toLowerCase() ===
          validChecksumToken.address.toLowerCase()
        ) {
          const baseContractAddress = validChecksumToken.address;
          const newData = { ...token.data, baseContractAddress };

          await queryRunner.manager.update(
            ContractEntity,
            { id: token.id },
            { data: newData },
          );
        }
      }
    }
  }

  public async down(): Promise<void> {
    void null;
  }
}
