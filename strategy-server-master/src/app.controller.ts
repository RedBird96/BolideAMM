import {
  Controller,
  Get,
  HttpStatus,
  InternalServerErrorException,
  Logger,
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
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { AuthAccountInterceptor } from 'src/interceptors/auth-account-interceptor.service';

import { AppService } from './app.service';
import { ACCOUNT_ROLES } from './common/constants/account-roles';
import { ERROR_CODES } from './common/constants/error-codes';
import { ErrorResponseDto } from './common/dto/ErrorResponseDto';
import { Roles } from './decorators/roles.decorator';
import { RollbarInterceptor } from './interceptors/rollbar-interceptor.service';
import { ConfigService } from './shared/services/config.service';
import { VaultService } from './shared/services/vault.service';

@ApiTags('common')
@UseInterceptors(RollbarInterceptor)
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
    private readonly vaultService: VaultService,
  ) {}

  @Get('/health')
  @ApiOperation({
    summary: 'Проверка статуса системы',
    description: '',
  })
  getHello(): { msg: boolean } {
    return {
      msg: this.appService.getHealth(),
    };
  }

  @Get('/cfg')
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(AuthAccountInterceptor)
  @ApiBearerAuth()
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
  })
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Полчение переменных конфига',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  async getConfig(): Promise<Record<string, any>> {
    const cnf = this.configService;

    return {
      env: cnf.nodeEnv,
      logLevel: cnf.logLevel,
      githash: cnf.githash,
      rollbar: {
        ...cnf.rollbar,
      },
      cookie: cnf.getCookieDomain(),
      nodeEnv: cnf.nodeEnv,
      redis: {
        ...cnf.redis,
      },
      bull: {
        ...cnf.bullQConfig,
      },
      isUseVault: cnf.isUseVault,
      vault: cnf.isUseVault ? await this.vaultService.getVaultMetadata() : null,
    };
  }

  @Get('/error/alerts/check')
  @UseGuards(AuthGuard, RolesGuard)
  @UseInterceptors(AuthAccountInterceptor)
  @ApiBearerAuth()
  @ApiBadRequestResponse({
    type: ErrorResponseDto,
  })
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Бросить тестовое исключение в алерт-систему',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  async sendErrorToNotifications(): Promise<any> {
    this.logger.debug({ message: 'test', error: 'Error alert check' });

    throw new InternalServerErrorException();
  }

  @Get('/codes')
  @ApiOperation({
    summary: 'Получение кодов ошибок',
    description: '',
  })
  getCodes(): any {
    const results = [];

    for (const key in ERROR_CODES as any) {
      if (typeof key !== 'function') {
        results.push(ERROR_CODES[key]);
      }
    }

    return results;
  }
}
