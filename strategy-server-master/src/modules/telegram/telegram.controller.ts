import { Controller, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ACCOUNT_ROLES } from 'src/common/constants/account-roles';
import { ErrorResponseDto } from 'src/common/dto/ErrorResponseDto';
import { Roles } from 'src/decorators/roles.decorator';
import { AuthGuard } from 'src/guards/auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { AuthAccountInterceptor } from 'src/interceptors/auth-account-interceptor.service';
import { RollbarInterceptor } from 'src/interceptors/rollbar-interceptor.service';

import { TelegramService } from './telegram.service';

@Controller()
@ApiTags('tg')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(RollbarInterceptor, AuthAccountInterceptor)
@ApiBearerAuth()
@ApiBadRequestResponse({
  type: ErrorResponseDto,
})
export class TelegramController {
  constructor(private telegramService: TelegramService) {}

  @Post('/tg/reset/admin')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary:
      'Обнулить настройки администратора, первый обратившийся к боту станет админом',
  })
  async resetAdmin(): Promise<any> {
    await this.telegramService.resetAdmin();

    return {
      msg: 'ok',
    };
  }

  @Post('/tg/send/test')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Отправить тестовое сообщение через бота',
  })
  async sendTest(): Promise<any> {
    await this.telegramService.sendTestMessage();

    return {
      msg: 'ok',
    };
  }
}
