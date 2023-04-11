import {
  Controller,
  Get,
  HttpStatus,
  Param,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { ContractsService } from 'src/modules/contracts/contracts.service';
import { StrategiesService } from 'src/modules/strategies/strategies.service';

import { BnbWeb3Service, WEB3_CONTEXT } from '../bnb-web3.service';
import { VenusBalanceService } from './venus-balance.service';
import { VenusComputeApyService } from './venus-compute-apy.service';
import { VenusEarnedService } from './venus-earned.service';
import { VenusLendedService } from './venus-lended.service';
import type { VenusTokenInfo } from './venus-token-info.interface';
import { VenusTokensInfoService } from './venus-tokens-info.service';

@Controller()
@ApiTags('Venus')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(RollbarInterceptor, AuthAccountInterceptor)
@ApiBearerAuth()
@ApiBadRequestResponse({
  type: ErrorResponseDto,
})
export class VenusController {
  constructor(
    private venusBalanceService: VenusBalanceService,
    private venusLendedService: VenusLendedService,
    private bnbWeb3Service: BnbWeb3Service,
    private contractsService: ContractsService,
    private strategiesService: StrategiesService,
    private venusComputeApyService: VenusComputeApyService,
    private venusTokensInfoService: VenusTokensInfoService,
    private venusEarnedService: VenusEarnedService,
  ) {}

  @Get('venus/lended/strategy/:id')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение баланса venus токенов',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    isArray: true,
  })
  async getVenusLendedTokens(@Param('id') id: number): Promise<any> {
    const web3 = await this.bnbWeb3Service.createInstance(
      WEB3_CONTEXT.ANALYTICS,
    );

    const strategy = await this.strategiesService.getStrategyById(Number(id));

    const { logicContract, storageContract } = strategy;

    return this.venusLendedService.getLendedTokens({
      logicContract,
      storageContract,
      web3,
    });
  }

  @Get('venus/tokens/balance/strategy/:id')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение баланса venus токенов на logicContract',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    isArray: true,
  })
  async getVenusTokensBalance(@Param('id') id: number): Promise<any> {
    const web3 = await this.bnbWeb3Service.createInstance(
      WEB3_CONTEXT.ANALYTICS,
    );

    const strategy = await this.strategiesService.getStrategyById(Number(id));

    const { logicContract } = strategy;

    const venusTokens = await this.contractsService.getVenusTokens(
      logicContract.blockchainId,
    );

    return this.venusBalanceService.getVTokensBalance({
      web3,
      venusTokens,
      logicContract,
    });
  }

  @Get('venus/tokens/compute/apy')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение compute apy для все токенов venus',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    isArray: true,
  })
  async getVenusComputeApy(): Promise<any> {
    const web3 = await this.bnbWeb3Service.createInstance(
      WEB3_CONTEXT.ANALYTICS,
    );

    return this.venusComputeApyService.getAllVenusTokensData({
      web3,
    });
  }

  @Get('venus/tokens/info')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение информации о токенах venus',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    isArray: true,
  })
  async getTokensInfo(): Promise<VenusTokenInfo[]> {
    const web3 = await this.bnbWeb3Service.createInstance(
      WEB3_CONTEXT.ANALYTICS,
    );

    return this.venusTokensInfoService.getAllVenusTokensInfo({ web3 });
  }

  @Get('venus/earned/:address/info')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary:
      'Получение информации о earned токенах на venus по адресу logic контракта',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    isArray: true,
  })
  async getEarnedInfoV2(@Param('address') address: string): Promise<string> {
    const web3 = await this.bnbWeb3Service.createInstance(
      WEB3_CONTEXT.ANALYTICS,
    );

    // eslint-disable-next-line no-console
    console.time('getEarnedInfoV2');
    const result = await this.venusEarnedService.getVenusEarned({
      web3,
      walletAddress: address,
    });
    // eslint-disable-next-line no-console
    console.timeEnd('getEarnedInfoV2');

    return result.toString();
  }
}
