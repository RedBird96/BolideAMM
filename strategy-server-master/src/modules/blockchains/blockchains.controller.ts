import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
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
import { ErrorResponseDto } from 'src/common/dto/ErrorResponseDto';
import { Roles } from 'src/decorators/roles.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { AuthAccountInterceptor } from 'src/interceptors/auth-account-interceptor.service';
import { RollbarInterceptor } from 'src/interceptors/rollbar-interceptor.service';

import { TransactionsPageDto } from '../bnb/dto/TransactionsPageDto';
import { TransactionsPageOptionsDto } from '../bnb/dto/TransactionsPageOptionsDto';
import { OperationsService } from '../operations/operations.service';
import { BlockchainsService, BlockchainState } from './blockchains.service';
import { BlockchainsSettingsService } from './blockchains-settings.service';
import { BlockchainDto } from './dto/BlockchainDto';
import { BlockchainSettingsDto } from './dto/BlockchainSettingsDto';
import { BlockchainSettingsUpdateDto } from './dto/BlockchainSettingsUpdateDto';

@Controller()
@ApiTags('Blockchains')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(RollbarInterceptor, AuthAccountInterceptor)
@ApiBearerAuth()
@ApiBadRequestResponse({
  type: ErrorResponseDto,
})
export class BlockchainsController {
  constructor(
    private readonly blockchainsService: BlockchainsService,
    private readonly blockchainsSettingsService: BlockchainsSettingsService,
    private readonly operationService: OperationsService,
  ) {}

  @Get('blockchains')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение списка блокчейнов',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: BlockchainDto,
    isArray: true,
  })
  getBlockchains(): Promise<BlockchainDto[]> {
    return this.blockchainsService.getList();
  }

  @Get('blockchains/:id')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение данных по блокчейну',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: BlockchainDto,
    isArray: true,
  })
  getBlockchain(@Param('id') id: number): Promise<BlockchainDto> {
    return this.blockchainsService.getById(id);
  }

  @Get('blockchains/:id/transactions')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение списка транзакций по блокчейну',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TransactionsPageDto,
    isArray: true,
  })
  async getBlockchainTransactions(
    @Param('id') id: number,
    @Query() pageOptionsDto: TransactionsPageOptionsDto,
  ): Promise<TransactionsPageDto> {
    const blockchainOperationsIds =
      await this.operationService.getIdsByBlockchainId(id);

    return this.blockchainsService.getBlockchainTransactions(
      id,
      blockchainOperationsIds,
      pageOptionsDto,
    );
  }

  @Get('blockchains/:id/state')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение state (контракты + пути обмена)',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  async getBlockchainState(@Param('id') id: number): Promise<BlockchainState> {
    return this.blockchainsService.getBlockchainState(id);
  }

  @Put('blockchains/:id/state')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Загрузка state (контракты + пути обмена)',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  async setBlockchainState(
    @Param('id') id: number,
    @Body() state: BlockchainState,
  ): Promise<void> {
    return this.blockchainsService.setBlockchainState(id, state);
  }

  @Put('blockchains/:id/settings')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Обновление настроек блокчейна',
    description: '',
  })
  @ApiBody({ type: BlockchainSettingsDto })
  @ApiResponse({ status: HttpStatus.OK, type: BlockchainDto })
  async updateBlockchainSettings(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: BlockchainSettingsUpdateDto,
  ): Promise<BlockchainDto> {
    return this.blockchainsSettingsService.updateBlockchainSettings(id, data);
  }
}
