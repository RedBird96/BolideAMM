import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BLOCKCHAIN_NAMES } from 'src/common/constants/blockchain-names';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { LogicException } from 'src/common/logic.exception';
import { Repository } from 'typeorm';

import { PageMetaDto } from '../../common/dto/PageMetaDto';
import type { BnbSettingsDto } from '../bnb/dto/BnbSettingsDto';
import { TransactionsPageDto } from '../bnb/dto/TransactionsPageDto';
import type { TransactionsPageOptionsDto } from '../bnb/dto/TransactionsPageOptionsDto';
import { TransactionsService } from '../bnb/transactions.service';
import type { ContractsState } from '../contracts/contracts-serializer.service';
import { ContractsSerializerService } from '../contracts/contracts-serializer.service';
import type { SwapPathState } from '../swap-paths/swap-paths-serializer.service';
import { SwapPathsSerializerService } from '../swap-paths/swap-paths-serializer.service';
import { BlockchainEntity } from './blockchain.entity';
import type { BlockchainDto } from './dto/BlockchainDto';

export interface BlockchainState {
  contracts: ContractsState;
  paths: SwapPathState;
}

@Injectable()
export class BlockchainsService {
  constructor(
    @InjectRepository(BlockchainEntity)
    private readonly repository: Repository<BlockchainEntity>,
    @Inject(forwardRef(() => TransactionsService))
    private readonly transactionsService: TransactionsService,
    private readonly contractsSerializerService: ContractsSerializerService,
    private readonly swapPathsSerializerService: SwapPathsSerializerService,
  ) {}

  async getList(): Promise<BlockchainDto[]> {
    const list = await this.repository.find();

    return list.map((item) => item.toDto());
  }

  async getById(id: number): Promise<BlockchainDto> {
    const blockchain = await this.repository.findOne({ id });

    if (!blockchain) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_BLOCKCHAIN);
    }

    return blockchain.toDto();
  }

  async getBlockchainTransactions(
    blockchainId: number,
    blockchainOperationsIds: string[],
    pageOptionsDto: TransactionsPageOptionsDto,
  ): Promise<TransactionsPageDto> {
    const blockchain = await this.repository.findOne(blockchainId);

    if (!blockchain) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_BLOCKCHAIN);
    }

    let operationsIds = blockchainOperationsIds;

    if (pageOptionsDto.operationsIds) {
      operationsIds = operationsIds.filter((operation) =>
        pageOptionsDto.operationsIds.includes(operation),
      );
    }

    if (operationsIds.length === 0) {
      const pageMetaDto = new PageMetaDto({
        pageOptionsDto,
        itemCount: 0,
      });

      return new TransactionsPageDto([], pageMetaDto);
    }

    return this.transactionsService.getItems({
      ...pageOptionsDto,
      operationsIds,
    });
  }

  async getBnbBlockchain(): Promise<BlockchainDto> {
    return this.getBlockchainByName(BLOCKCHAIN_NAMES.BNB);
  }

  async getBnbBlockchainEntity(): Promise<BlockchainEntity> {
    return this.getBlockchainByNameOrFail(BLOCKCHAIN_NAMES.BNB);
  }

  async getBnbBlockchainSettings(): Promise<BnbSettingsDto> {
    const blockchain = await this.getBnbBlockchain();

    return blockchain.settings as BnbSettingsDto;
  }

  async getBlockchainByName(name: BLOCKCHAIN_NAMES): Promise<BlockchainDto> {
    const blockchain = await this.getBlockchainByNameOrFail(name);

    return blockchain.toDto();
  }

  async getBlockchainState(id: number): Promise<BlockchainState> {
    const contractsState =
      await this.contractsSerializerService.serializeContractsToState(id);
    const swapPathsState =
      await this.swapPathsSerializerService.serializeSwapPaths(id);

    return {
      contracts: {
        ...contractsState,
      },
      paths: {
        ...swapPathsState,
      },
    };
  }

  async setBlockchainState(id: number, state: BlockchainState): Promise<void> {
    if (state.contracts) {
      await this.contractsSerializerService.deserializeContractsFromState(
        id,
        state.contracts,
      );
    }

    if (state.paths) {
      await this.swapPathsSerializerService.deserializeSwapPaths(
        id,
        state.paths,
      );
    }
  }

  private async getBlockchainByNameOrFail(
    name: BLOCKCHAIN_NAMES,
  ): Promise<BlockchainEntity> {
    const blockchain = await this.repository.findOne({ name });

    if (!blockchain) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_BLOCKCHAIN);
    }

    return blockchain;
  }
}
