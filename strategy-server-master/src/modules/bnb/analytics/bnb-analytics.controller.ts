import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
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

import { BnbWeb3Service, WEB3_CONTEXT } from '../bnb-web3.service';
import { ApyStatsRepository } from './apy-stats.repository';
import { BnbAnalyticsService } from './bnb-analytics.service';
import { ApyStatsPageDto } from './dto/ApyStatsPageDto';
import { ApyStatsPageOptionsDto } from './dto/ApyStatsPageOptionsDto';
import { FarmStatsPageDto } from './dto/FarmStatsPageDto';
import { FarmStatsPageOptionsDto } from './dto/FarmStatsPageOptionsDto';
import { GetApysAnaliticsDataDto } from './dto/GetApysAnaliticsDataDto';
import { GetFarmAnalyticDataDto } from './dto/GetFarmAnalyticDataDto';
import { GetLendingsAnalyticDataDto } from './dto/GetLendingsAnalyticDataDto';
import { LendingStatsPageDto } from './dto/LendigStatsPageDto';
import { LendingStatsPageOptionsDto } from './dto/LendingStatsPageDto';
import { FarmStatsRepository } from './farm-stats.repository';
import { LendingStatsRepository } from './lending-stats.repository';

@Controller()
@ApiTags('BNB analytics')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(RollbarInterceptor, AuthAccountInterceptor)
@ApiBearerAuth()
@ApiBadRequestResponse({
  type: ErrorResponseDto,
})
export class BnbAnalyticsController {
  constructor(
    private bnbAnalyticsService: BnbAnalyticsService,
    private farmStatsRepository: FarmStatsRepository,
    private lendingStatsRepository: LendingStatsRepository,
    private apyStatsRepository: ApyStatsRepository,
    private bnbWeb3Service: BnbWeb3Service,
  ) {}

  @Get('bnb/analytics/farms/get/data/')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary:
      'Запускаем запрос на аналитику farms (сохранит в базу) и получаем результат',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: GetFarmAnalyticDataDto,
  })
  async bnbAnalyticsFarms(): Promise<GetFarmAnalyticDataDto> {
    const web3 = await this.bnbWeb3Service.createInstance(
      WEB3_CONTEXT.ANALYTICS,
    );

    return this.bnbAnalyticsService.getAndSaveFarmsAnalyticStat(web3);
  }

  @Get('bnb/analytics/lendings/get/data/')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary:
      'Запускаем запрос на аналитику lending (сохранит в базу) и получаем результат',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: GetLendingsAnalyticDataDto,
  })
  async bnbAnalyticsLendings(): Promise<GetLendingsAnalyticDataDto> {
    const web3 = await this.bnbWeb3Service.createInstance(
      WEB3_CONTEXT.ANALYTICS,
    );

    const venus =
      await this.bnbAnalyticsService.getSaveAndCheckVenusAnalyticsStat(web3);

    return {
      venus,
    };
  }

  @Get('bnb/analytics/apys/get/data/')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary:
      'Запускаем запрос на аналитику apys (сохранит в базу) и получаем результат',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: GetApysAnaliticsDataDto,
  })
  async bnbAnalyticsApys(): Promise<GetApysAnaliticsDataDto[]> {
    const web3 = await this.bnbWeb3Service.createInstance(
      WEB3_CONTEXT.ANALYTICS,
    );

    return this.bnbAnalyticsService.getAndSaveFarmsLendingsApysStat(web3);
  }

  @Get('bnb/analytics/farms')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Получение списка записей аналитики farms',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: FarmStatsPageDto,
  })
  getFarmsStats(
    @Query()
    pageOptionsDto: FarmStatsPageOptionsDto,
  ): Promise<FarmStatsPageDto> {
    return this.farmStatsRepository.getFarmStats({
      ...pageOptionsDto,
    });
  }

  @Get('bnb/analytics/lendings')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Получение списка записей аналитики lendings',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: LendingStatsPageDto,
  })
  getLendingsStats(
    @Query()
    pageOptionsDto: LendingStatsPageOptionsDto,
  ): Promise<LendingStatsPageDto> {
    return this.lendingStatsRepository.getLendingStats({
      ...pageOptionsDto,
    });
  }

  @Get('bnb/analytics/apys')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Получение списка записей аналитики apys',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ApyStatsPageDto,
  })
  getApysStats(
    @Query()
    pageOptionsDto: ApyStatsPageOptionsDto,
  ): Promise<ApyStatsPageDto> {
    return this.apyStatsRepository.getApyStats({
      ...pageOptionsDto,
    });
  }
}
