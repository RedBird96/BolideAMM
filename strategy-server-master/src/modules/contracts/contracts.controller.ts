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

import { ContractsService } from './contracts.service';
import { ContractCreateDto } from './dto/ContractCreateDto';
import type { ContractDto } from './dto/ContractDto';
import { ContractListOptionsDto } from './dto/ContractListOptionsDto';
import { ContractUpdateDto } from './dto/ContractUpdateDto';

@Controller()
@ApiTags('Contracts')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(RollbarInterceptor, AuthAccountInterceptor)
@ApiBearerAuth()
@ApiBadRequestResponse({
  type: ErrorResponseDto,
})
export class ContractsController {
  constructor(private contractsService: ContractsService) {}

  @Get('contracts')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение списка контрактов',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async getContractsList(
    @Query() query: ContractListOptionsDto,
  ): Promise<ContractDto[]> {
    const contracts = await this.contractsService.getContracts(query);

    return contracts.map((contract) => contract.toDto());
  }

  @Get('contracts/:id')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Получение контракта по id',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async getContract(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ContractDto> {
    return this.contractsService.findOneById(id);
  }

  @Post('contracts')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Добавление контракта',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async createContract(@Body() data: ContractCreateDto): Promise<ContractDto> {
    return this.contractsService.createContract(data);
  }

  @Put('contracts/:id')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Обновление контракта по id',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async updateContract(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: ContractUpdateDto,
  ): Promise<ContractDto> {
    return this.contractsService.updateContractById(id, data);
  }

  @Delete('contracts/:id')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Удаление контракта по id',
    description: '',
  })
  @ApiResponse({ status: HttpStatus.OK })
  async deleteContract(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.contractsService.deleteContract(id);
  }
}
