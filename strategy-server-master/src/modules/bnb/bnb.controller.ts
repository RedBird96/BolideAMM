import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ACCOUNT_ROLES } from 'src/common/constants/account-roles';
import { BLOCKCHAIN_NAMES } from 'src/common/constants/blockchain-names';
import { ErrorResponseDto } from 'src/common/dto/ErrorResponseDto';
import { Roles } from 'src/decorators/roles.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { AuthAccountInterceptor } from 'src/interceptors/auth-account-interceptor.service';
import { RollbarInterceptor } from 'src/interceptors/rollbar-interceptor.service';

import { BlockchainsSettingsService } from '../blockchains/blockchains-settings.service';
import type { BlockchainDto } from '../blockchains/dto/BlockchainDto';
import { TransactionsPageDto } from '../bnb/dto/TransactionsPageDto';
import { BnbSettingsUpdateDto } from './dto/BnbSettingsUpdateDto';
import { TransactionsByUidDto } from './dto/TransactionsByUidDto';
import { TransactionsPageOptionsDto } from './dto/TransactionsPageOptionsDto';
import { TransactionsRepository } from './transactions.repository';

@Controller()
@ApiTags('BNB')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(RollbarInterceptor, AuthAccountInterceptor)
@ApiBearerAuth()
@ApiBadRequestResponse({
  type: ErrorResponseDto,
})
export class BnbController {
  constructor(
    private transactionsRepository: TransactionsRepository,
    private readonly blockchainsSettingsService: BlockchainsSettingsService,
  ) {}

  @Get('bnb/transactions/')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение лога транзакций в блокчейн',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TransactionsPageDto,
  })
  getTransactionsLogs(
    @Query()
    pageOptionsDto: TransactionsPageOptionsDto,
  ): Promise<TransactionsPageDto> {
    return this.transactionsRepository.getItems(pageOptionsDto);
  }

  @Get('bnb/transactions/:uid')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение транзакций по uid операции',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TransactionsByUidDto,
  })
  getTransactionsByUid(
    @Param('uid') uid: string,
  ): Promise<TransactionsByUidDto> {
    return this.transactionsRepository.getTransactionsByUid(uid);
  }

  @Put('bnb/settings')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Изменение настроек блокчейна',
    description: '',
  })
  @ApiBody({ type: BnbSettingsUpdateDto })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  updateSettings(@Body() data: BnbSettingsUpdateDto): Promise<BlockchainDto> {
    return this.blockchainsSettingsService.updateBlockchainSettings(
      BLOCKCHAIN_NAMES.BNB,
      data,
    );
  }
}
