import {
  Controller,
  Get,
  HttpStatus,
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

import { TelegramSettingsDto } from './dto/TelegramSettingsDto';
import { TelegramSettingsService } from './tg-settings.service';

@Controller()
@ApiTags('telegram settings')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(AuthAccountInterceptor)
@ApiBearerAuth()
@ApiBadRequestResponse({
  type: ErrorResponseDto,
})
export class TelegramSettingsController {
  constructor(private settingsService: TelegramSettingsService) {}

  @Get('tg/settings/all')
  @ApiOperation({
    summary: 'Получение настроек',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: TelegramSettingsDto,
  })
  @Roles(ACCOUNT_ROLES.ADMIN)
  async getSettings(): Promise<TelegramSettingsDto> {
    const settings = await this.settingsService.getSettings();

    return settings.toDto();
  }
}
