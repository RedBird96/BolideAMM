import {
  Body,
  Controller,
  Get,
  HttpCode,
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
import type { UpdateResult } from 'typeorm';

import { BnbWeb3Service, WEB3_CONTEXT } from '../bnb/bnb-web3.service';
import { OperationDto } from './dto/OperationDto';
import { OperationGasUsedDto } from './dto/OperationGasUsedDto';
import { OperationsListDto } from './dto/OperationsListDto';
import { OperationsListOptionsDto } from './dto/OperationsListOptionsDto';
import { OperationStatusUpdateDto } from './dto/OperationStatusUpdateDto';
import { OperationsService } from './operations.service';

@Controller()
@ApiTags('Operations')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(RollbarInterceptor, AuthAccountInterceptor)
@ApiBearerAuth()
@ApiBadRequestResponse({
  type: ErrorResponseDto,
})
export class OperationsController {
  constructor(
    private operationService: OperationsService,
    private bnbWeb3Service: BnbWeb3Service,
  ) {}

  @Get('operations/:id')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение операции по ид',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OperationDto,
  })
  getById(@Param('id') id: string): Promise<OperationDto> {
    return this.operationService.findOneById(id);
  }

  @Get('operations')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение операций по стратегии',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OperationsListDto,
  })
  async getOperations(
    @Query() pageOptionsDto: OperationsListOptionsDto,
  ): Promise<OperationsListDto> {
    return this.operationService.getOperations(pageOptionsDto);
  }

  @Get('operations/:id/gas/used')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение кол-во используемого газа по операции',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OperationGasUsedDto,
  })
  async getOperationGasUsed(
    @Param('id') id: string,
  ): Promise<OperationGasUsedDto> {
    const web3 = await this.bnbWeb3Service.createInstance(
      WEB3_CONTEXT.ANALYTICS,
    );

    return this.operationService.getOperationGasUsed({ operationId: id, web3 });
  }

  @Put('operations/:id/status')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Изменить статус у операции',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  async updateOperationStatus(
    @Param('id') id: string,
    @Body() data: OperationStatusUpdateDto,
  ): Promise<UpdateResult> {
    return this.operationService.updateOperationStatus(id, data.status);
  }
}
