import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
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

import { RuntimeKeyCreateDto } from './dto/RuntimeKeyCreateDto';
import { RuntimeKeyDto } from './dto/RuntimeKeyDto';
import { RuntimeKeyUpdateDto } from './dto/RuntimeKeyUpdateDto';
import { RuntimeKeysService } from './runtime-keys.service';

@Controller()
@ApiTags('RuntimeKeys')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(RollbarInterceptor, AuthAccountInterceptor)
@ApiBearerAuth()
@ApiBadRequestResponse({
  type: ErrorResponseDto,
})
export class RuntimeKeysController {
  constructor(private runtimeKeysService: RuntimeKeysService) {}

  @Get('runtime-keys')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение списка runtime ключей',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: RuntimeKeyDto,
    isArray: true,
  })
  getRuntimeKeys(): Promise<RuntimeKeyDto[]> {
    return this.runtimeKeysService.getAll();
  }

  @Get('runtime-keys/:id')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение runtime ключа по id',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: RuntimeKeyDto,
  })
  getRuntimeKeyById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RuntimeKeyDto> {
    return this.runtimeKeysService.getById(id);
  }

  @Post('runtime-keys')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Добавление runtime ключа',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: RuntimeKeyDto,
  })
  createRuntimeKey(@Body() data: RuntimeKeyCreateDto): Promise<RuntimeKeyDto> {
    return this.runtimeKeysService.create(data);
  }

  @Put('runtime-keys/:id')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Изменение runtime ключа',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: RuntimeKeyDto,
  })
  updateRuntimeKey(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: RuntimeKeyUpdateDto,
  ): Promise<RuntimeKeyDto> {
    return this.runtimeKeysService.updateById(id, data);
  }

  @Delete('runtime-keys/:id')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Удаление runtime ключа',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  removeRuntimeKey(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.runtimeKeysService.removeById(id);
  }
}
