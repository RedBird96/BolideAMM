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
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ACCOUNT_ROLES } from 'src/common/constants/account-roles';
import { PLATFORMS } from 'src/common/constants/platforms';
import { ErrorResponseDto } from 'src/common/dto/ErrorResponseDto';
import { Roles } from 'src/decorators/roles.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { AuthAccountInterceptor } from 'src/interceptors/auth-account-interceptor.service';
import { RollbarInterceptor } from 'src/interceptors/rollbar-interceptor.service';

import { BnbWeb3Service, WEB3_CONTEXT } from '../bnb/bnb-web3.service';
import { StrategyPairListDto } from '../strategies/strategy-pair/dto/StrategyPairListDto';
import { CreatePairOptionsDto } from './dto/CreatePairOptionsDto';
import { PairDto } from './dto/PairDto';
import type { PairListDto } from './dto/PairListDto';
import { PairListOptionsDto } from './dto/PairListOptionsDto';
import { PairsService } from './pairs.service';

@Controller()
@ApiTags('pairs')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(RollbarInterceptor, AuthAccountInterceptor)
@ApiBearerAuth()
@ApiBadRequestResponse({
  type: ErrorResponseDto,
})
export class PairController {
  constructor(
    private pairsService: PairsService,
    private bnbWeb3Service: BnbWeb3Service,
  ) {}

  @Get('/pairs')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({ summary: 'Получение списка пар', description: '' })
  @ApiResponse({ status: HttpStatus.OK, type: PairListOptionsDto })
  async getPairs(
    @Query()
    pageOptionsDto: PairListOptionsDto,
  ): Promise<PairListDto> {
    return this.pairsService.getPairs(pageOptionsDto);
  }

  @Post('/pairs')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Добавление/изменение пары', description: '' })
  @ApiResponse({ status: HttpStatus.OK, type: PairDto })
  async saveOrUpdatePair(@Body() data: CreatePairOptionsDto): Promise<PairDto> {
    return this.pairsService.saveOrUpdatePair(data);
  }

  @Delete('/pairs/:platform')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiParam({ name: 'platform', enum: PLATFORMS })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Удалить все пары платформы',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async removeAllByMarket(@Param('platform') platform: PLATFORMS) {
    return this.pairsService.removeAllByPlatform(platform);
  }

  @Post('/pairs/reload/:platform/blockchain/:blockchainId')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiParam({ name: 'platform', enum: PLATFORMS })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Выгрузить пары с платформы и сохранить в базу данных',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK, type: StrategyPairListDto })
  async reloadPairs(
    @Param('platform') platform: PLATFORMS,
    @Param('blockchainId', ParseIntPipe) blockchainId: number,
  ): Promise<void> {
    const web3 = await this.bnbWeb3Service.createInstance(
      WEB3_CONTEXT.ANALYTICS,
    );

    return this.pairsService.reloadPairs({
      blockchainId,
      platform,
      web3,
    });
  }
}
