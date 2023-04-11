import {
  Controller,
  Get,
  HttpStatus,
  Param,
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
import { isString } from 'lodash';
import { ACCOUNT_ROLES } from 'src/common/constants/account-roles';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { ErrorResponseDto } from 'src/common/dto/ErrorResponseDto';
import { LogicException } from 'src/common/logic.exception';
import { Roles } from 'src/decorators/roles.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { AuthAccountInterceptor } from 'src/interceptors/auth-account-interceptor.service';
import { RollbarInterceptor } from 'src/interceptors/rollbar-interceptor.service';

import { AccountsService } from './accounts.service';
import { AccountDto } from './dto/AccountDto';
import { AccountsPageDto } from './dto/AccountsPageDto';
import { AccountsPageOptionsDto } from './dto/AccountsPageOptionsDto';

@Controller()
@ApiTags('accounts')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(RollbarInterceptor, AuthAccountInterceptor)
@ApiBearerAuth()
@ApiBadRequestResponse({
  type: ErrorResponseDto,
})
export class AccountsController {
  constructor(private accountsService: AccountsService) {}

  @Get('accounts')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение списка аккаунтов',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: AccountsPageDto,
  })
  getAccounts(
    @Query()
    pageOptionsDto: AccountsPageOptionsDto,
  ): Promise<AccountsPageDto> {
    return this.accountsService.getAccounts(pageOptionsDto);
  }

  @Get('accounts/:id')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение аккаунта по id',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: AccountDto,
  })
  async getAccount(@Param('id') id: string): Promise<AccountDto> {
    if (!isString(id)) {
      throw new LogicException(ERROR_CODES.NOT_FOUND_ACCOUNT);
    }

    const account = await this.accountsService.findOneAndCheckExist({ id });

    return account.toDto();
  }
}
