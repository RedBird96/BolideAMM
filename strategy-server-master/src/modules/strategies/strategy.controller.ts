import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
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
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { ErrorResponseDto } from 'src/common/dto/ErrorResponseDto';
import { LogicException } from 'src/common/logic.exception';
import { IsPublic } from 'src/decorators/is-public.decorator';
import { Roles } from 'src/decorators/roles.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { AuthAccountInterceptor } from 'src/interceptors/auth-account-interceptor.service';
import { RollbarInterceptor } from 'src/interceptors/rollbar-interceptor.service';
import type { DeleteResult } from 'typeorm';

import { BalanceService } from '../bnb/balance.service';
import { BnbWeb3Service, WEB3_CONTEXT } from '../bnb/bnb-web3.service';
import { VenusBalanceService } from '../bnb/venus/venus-balance.service';
import { ContractsService } from '../contracts/contracts.service';
import { BoostingService } from '../land-borrow-farm-strategy/boosting.service';
import { LBF_BULL_EVENTS } from '../land-borrow-farm-strategy/constants/lbf-bull-events';
import { LandBorrowFarmSettingsUpdateDto } from '../land-borrow-farm-strategy/dto/LandBorrowFarmSettingsUpdateDto';
import { RunStrategyOptionsDto } from '../land-borrow-farm-strategy/dto/RunStrategyOptionsDto';
import { WalletBalancesDto } from '../land-borrow-farm-strategy/dto/WalletBalancesDto';
import { RunStrategyDto } from '../operations/dto/RunStrategyDto';
import { OPERATION_TYPE } from '../operations/operation.entity';
import { OperationsService } from '../operations/operations.service';
import { StatItemDto } from './dto/StatItemDto';
import { StrategyCreateDto } from './dto/StrategyCreateDto';
import { StrategyDto } from './dto/StrategyDto';
import { StrategyListDto } from './dto/StrategyListDto';
import { StrategyListOptionsDto } from './dto/StrategyListOptionsDto';
import { StrategyNameUpdateDto } from './dto/StrategyNameUpdateDto';
import type { StrategyOperationsCountDto } from './dto/StrategyOperationsCountDto';
import { StrategyStatusUpdateDto } from './dto/StrategyStatusUpdateDto';
import { StrategyUpdateDto } from './dto/StrategyUpdateDto';
import { StrategiesService } from './strategies.service';
import { StrategyPairAddDto } from './strategy-pair/dto/StrategyPairAddDto';
import { StrategyPairDto } from './strategy-pair/dto/StrategyPairDto';
import { StrategyPairListDto } from './strategy-pair/dto/StrategyPairListDto';
import { StrategyPairListOptionsDto } from './strategy-pair/dto/StrategyPairListOptionsDto';
import { StrategyPairUpdateDto } from './strategy-pair/dto/StrategyPairUpdateDto';

@Controller()
@ApiTags('strategies')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(RollbarInterceptor, AuthAccountInterceptor)
@ApiBearerAuth()
@ApiBadRequestResponse({
  type: ErrorResponseDto,
})
export class StrategyController {
  constructor(
    private strategiesService: StrategiesService,
    private balanceService: BalanceService,
    private boostingService: BoostingService,
    private operationService: OperationsService,
    private venusBalanceService: VenusBalanceService,
    private contractsService: ContractsService,
    private bnbWeb3Service: BnbWeb3Service,
  ) {}

  @Get('/strategies')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({ summary: 'Получение списка стратегий', description: '' })
  @ApiResponse({ status: HttpStatus.OK, type: StrategyListDto })
  async getStrategies(
    @Query()
    pageOptionsDto: StrategyListOptionsDto,
  ): Promise<StrategyListDto> {
    return this.strategiesService.getStrategies(pageOptionsDto);
  }

  @Get('/strategies/active')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение списка активных стратегий',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK, type: StrategyDto, isArray: true })
  async getActiveStrategies(): Promise<StrategyDto[]> {
    return this.strategiesService.getActiveStrategies();
  }

  @Post('/strategies')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Создание новой стратегии',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async createStrategy(@Body() data: StrategyCreateDto): Promise<StrategyDto> {
    return this.strategiesService.createStrategy(data);
  }

  @Get('/strategies/:id')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({ summary: 'Получение стратегии по id', description: '' })
  @ApiResponse({ status: HttpStatus.OK, type: StrategyDto })
  async getStrategyById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StrategyDto> {
    return this.strategiesService.getStrategyById(id);
  }

  @Put('/strategies/:id')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Обновление параметров стратегии по id',
    description:
      'Внимание! После этих изменений стратегий становится неактивной',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async updateStrategyById(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: StrategyUpdateDto,
  ): Promise<StrategyDto> {
    return this.strategiesService.updateStrategyById(id, data);
  }

  @Put('/strategies/:id/status')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Обновление статуса стратегии по id',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async updateStrategyStatusById(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: StrategyStatusUpdateDto,
  ): Promise<StrategyDto> {
    return this.strategiesService.updateStrategyStatusById(id, data);
  }

  @Put('/strategies/:id/name')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Обновление названия стратегии по id',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async updateStrategyNameById(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: StrategyNameUpdateDto,
  ): Promise<StrategyDto> {
    return this.strategiesService.updateStrategyNameById(id, data);
  }

  @Get('/strategies/:id/pairs')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение стратегии и пар по id стратегии',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK, type: StrategyPairListDto })
  async getStrategPairsById(
    @Query()
    pageOptionsDto: StrategyPairListOptionsDto,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StrategyPairListDto> {
    return this.strategiesService.getStrategPairsByStrId(id, pageOptionsDto);
  }

  @Get('/strategies/:id/operations/count')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение количества операций по стратегии',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  async getOperationsCount(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StrategyOperationsCountDto> {
    return this.operationService.getCountByStrategyId(id);
  }

  @Post('/strategies/:id/pairs')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Добавление пары в стратегию',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK, type: StrategyPairListDto })
  async addStrategyPair(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: StrategyPairAddDto,
  ): Promise<StrategyPairListDto> {
    return this.strategiesService.addStrategyPair(id, data);
  }

  @Put('/strategies/:id/pairs/:pairId')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Обновление пары в стратегии',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK, type: StrategyPairDto })
  async updateStrategyPair(
    @Param('id', ParseIntPipe) id: number,
    @Param('pairId', ParseIntPipe) pairId: number,
    @Body() data: StrategyPairUpdateDto,
  ): Promise<StrategyPairDto> {
    return this.strategiesService.updateStrategyPair(id, pairId, data);
  }

  @Delete('/strategies/:id')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Удаление стратегии',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK, type: StrategyPairListDto })
  async deleteStrategy(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.strategiesService.deleteStrategy(id);
  }

  @Delete('/strategies/:id/pairs/:pairId')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Удаление пары в стратегии',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK, type: StrategyPairListDto })
  async deleteStrategPair(
    @Param('id', ParseIntPipe) id: number,
    @Param('pairId', ParseIntPipe) pairId: number,
  ): Promise<StrategyPairListDto> {
    return this.strategiesService.deleteStrategyPair(id, pairId);
  }

  @Post('/strategies/:id/reserves/recreate')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Запустить пересборку reserves по id стратегии' })
  @ApiResponse({ status: HttpStatus.OK, type: RunStrategyDto })
  async reservesRecreate(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RunStrategyDto> {
    return this.strategiesService.runOperationByRestApiCall({
      strategyId: id,
      type: OPERATION_TYPE.RECREATE_RESERVES,
      lbfBullEvent: LBF_BULL_EVENTS.STRATEGY_AND_CLAIM_JOB,
    });
  }

  @Post('/strategies/:id/withdraw/all/to/storage/')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Снять весь фарминг, отдать венус и перевести токены на Storage',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async withdrawAllToStorage(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RunStrategyDto> {
    return this.strategiesService.runOperationByRestApiCall({
      strategyId: id,
      type: OPERATION_TYPE.WITHDRAW_ALL_TO_STORAGE,
      lbfBullEvent: LBF_BULL_EVENTS.STRATEGY_AND_CLAIM_JOB,
    });
  }

  @Post('/strategies/:id/run/')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Запустить операции по id стратегии',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: RunStrategyDto,
  })
  async strategyRun(
    @Param('id', ParseIntPipe) id: number,
    @Query()
    pageOptionsDto: RunStrategyOptionsDto,
  ): Promise<RunStrategyDto> {
    return this.strategiesService.runOperationByRestApiCall({
      strategyId: id,
      type: OPERATION_TYPE.STRATEGY_RUN,
      lbfBullEvent: LBF_BULL_EVENTS.STRATEGY_AND_CLAIM_JOB,
      payload: { isNeedToRecreateAll: pageOptionsDto.isNeedToRecreateAll },
    });
  }

  @Post('/strategies/:id/claim/run/')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Запустить распределение по id стратегии',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: RunStrategyDto,
  })
  async claimRun(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RunStrategyDto> {
    return this.strategiesService.runOperationByRestApiCall({
      strategyId: id,
      type: OPERATION_TYPE.CLAIM_RUN,
      lbfBullEvent: LBF_BULL_EVENTS.STRATEGY_AND_CLAIM_JOB,
    });
  }

  @Post('/strategies/:id/claim/venus/run/')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Запустить claim venus для id стратегии',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: RunStrategyDto,
  })
  async claimVenusRun(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RunStrategyDto> {
    return this.strategiesService.runOperationByRestApiCall({
      strategyId: id,
      type: OPERATION_TYPE.VENUS_CLAIM_RUN,
      lbfBullEvent: LBF_BULL_EVENTS.STRATEGY_AND_CLAIM_JOB,
    });
  }

  @Get('/strategies/:id/balances/')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение баланса и аналитики по стратегии',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: StatItemDto,
  })
  async getStrategyBalances(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<StatItemDto> {
    const web3 = await this.bnbWeb3Service.createInstance(
      WEB3_CONTEXT.ANALYTICS,
    );

    return this.strategiesService.calcAnalytics({ strategyId: id, web3 });
  }

  @Get('/strategies/:id/admin/balances')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение балансов кошелька админа',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: WalletBalancesDto,
  })
  async getAdminBalances(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<WalletBalancesDto> {
    const web3 = await this.bnbWeb3Service.createInstance(
      WEB3_CONTEXT.ANALYTICS,
    );

    return this.balanceService.getAdminBalances({ strategyId: id, web3 });
  }

  @Get('/strategies/:id/boosting/balances')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение балансов кошелька для бустинга',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: WalletBalancesDto,
  })
  async getBoostingBalances(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<WalletBalancesDto> {
    return this.boostingService.getBoostingBalances(id);
  }

  @Get('/strategies/:id/boosting/quantity/tokens/in/block')
  @IsPublic()
  @ApiOperation({
    summary: 'Получение переменной quantityTokensInBlock',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: Number,
  })
  async getQuantityTokensInBlock(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<number> {
    return this.strategiesService.getQuantityTokensInBlock({ strategyId: id });
  }

  @Put('/strategies/:id/settings')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Обновление настроек у стратегии',
    description: '',
  })
  @ApiBody({ type: LandBorrowFarmSettingsUpdateDto })
  @ApiResponse({ status: HttpStatus.OK })
  async updateStrategySettings(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: LandBorrowFarmSettingsUpdateDto,
  ): Promise<StrategyDto> {
    return this.strategiesService.updateStrategySettingsById({
      id,
      newSettins: data,
    });
  }

  @Get('/strategies/:id/venus/balances')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение балансы стратегии на venus',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  async getStrategyVenusBalances(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<any> {
    const strategy = await this.strategiesService.getStrategyById(id);

    if (!strategy) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_STRATEGY);
    }

    const { logicContractId } = strategy;

    const logicContract = await this.contractsService.getContractById(
      logicContractId,
    );

    const web3 = await this.bnbWeb3Service.createInstance();

    const venusTokens = await this.contractsService.getVenusTokens(
      logicContract.blockchainId,
    );

    return this.venusBalanceService.getStrategyBalances({
      logicContract,
      web3,
      venusTokens,
    });
  }

  @Delete('/strategies/pairs/remove/all')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Удаление всех пар стратегий',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async deleteAll(): Promise<DeleteResult> {
    return this.strategiesService.deleteAllPairs();
  }
}
