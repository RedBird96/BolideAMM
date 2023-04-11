import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from 'src/common/dto/ErrorResponseDto';
import { RollbarInterceptor } from 'src/interceptors/rollbar-interceptor.service';

import { ApyService } from '../bnb/apy/apy.service';
import { ApyDto } from '../bnb/apy/dto/ApyDto';
import { ApyHistoryDto } from '../bnb/apy/dto/ApyHistoryDto';
import { BnbWeb3Service, WEB3_CONTEXT } from '../bnb/bnb-web3.service';
import { TvlDto } from '../bnb/tvl/dto/TvlDto';
import { TvlHistoryDto } from '../bnb/tvl/dto/TvlHistoryDto';
import { TvlService } from '../bnb/tvl/tvl.service';
import { TvlHistoryService } from '../bnb/tvl/tvl-history.service';
import { CONTRACT_TYPES } from '../contracts/constants/contract-types';
import { ContractsService } from '../contracts/contracts.service';
import type { ContractDto } from '../contracts/dto/ContractDto';
import { StrategiesService } from '../strategies/strategies.service';
import { GetVaultPortfolioDto } from './dto/GetVaultPortfolioDto';
import { HistoryOptionsDto } from './dto/HistoryOptions';

@Controller('external/api')
@ApiTags('External')
@UseInterceptors(RollbarInterceptor)
@ApiBadRequestResponse({
  type: ErrorResponseDto,
})
export class ExternalController {
  constructor(
    private contractsService: ContractsService,
    private tvlService: TvlService,
    private tvlHistoryService: TvlHistoryService,
    private apyService: ApyService,
    private strategiesService: StrategiesService,
    private bnbWeb3Service: BnbWeb3Service,
  ) {}

  @Get('vaults')
  @ApiOperation({
    summary:
      'Получение списка Storage контрактов и токенов, которые могут быть задепозичены',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async getVaults(): Promise<ContractDto[]> {
    const contracts = await this.contractsService.getContracts({
      type: CONTRACT_TYPES.STR_STORAGE,
    });

    return contracts.map((contract) => contract.toDto());
  }

  @Get('farms')
  @ApiOperation({
    summary: 'Получение списка Farming контрактов',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async getFarms(): Promise<ContractDto[]> {
    const contracts = await this.contractsService.getFarmContracts();

    return contracts.map((contract) => contract.toDto());
  }

  @Get('tvl')
  @ApiOperation({
    summary: 'Подсчет TVL',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TvlDto,
  })
  async getTVL(): Promise<TvlDto> {
    const web3 = await this.bnbWeb3Service.createInstance(
      WEB3_CONTEXT.ANALYTICS,
    );

    return this.tvlService.getTvlData(web3);
  }

  @Get('apy')
  @ApiOperation({
    summary: 'Подсчет APY',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ApyDto,
  })
  async getAPY(): Promise<ApyDto> {
    const web3 = await this.bnbWeb3Service.createInstance(
      WEB3_CONTEXT.ANALYTICS,
    );

    return this.apyService.getApyData(web3);
  }

  @Get('tvl/history')
  @ApiOperation({
    summary: 'Получение истории значений TVL',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TvlHistoryDto,
    isArray: true,
  })
  async getTvlHistory(
    @Query() historyOptions: HistoryOptionsDto,
  ): Promise<TvlHistoryDto[]> {
    return this.tvlHistoryService.getTvlHistoryData(historyOptions);
  }

  @Get('apy/history')
  @ApiOperation({
    summary: 'Получение истории значений APY',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ApyHistoryDto,
    isArray: true,
  })
  async getApyHistory(
    @Query() historyOptions: HistoryOptionsDto,
  ): Promise<ApyHistoryDto[]> {
    return this.apyService.getApyHistoryData(historyOptions);
  }

  @Get('/boosting/quantity/tokens/in/block/:storage')
  @ApiOperation({
    summary: 'Получение переменной quantityTokensInBlock для storage',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: Number,
  })
  async getQuantityTokensInBlock(
    @Param('storage') storage: string,
  ): Promise<number> {
    return this.strategiesService.getQuantityTokensInBlockByStorage({
      storage,
    });
  }

  @Get('/vault/portfolio/:storage')
  @ApiOperation({
    summary: 'Получение данных по vault',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: GetVaultPortfolioDto,
  })
  async getVaultPortfolio(
    @Param('storage') storage: string,
  ): Promise<GetVaultPortfolioDto> {
    return this.strategiesService.getVaultPortfolio({
      storage,
    });
  }
}
