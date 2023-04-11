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

import { SwapPathCreateDto } from './dto/SwapPathCreateDto';
import { SwapPathDto } from './dto/SwapPathDto';
import { SwapPathListDto } from './dto/SwapPathListDto';
import { SwapPathListOptionsDto } from './dto/SwapPathListOptionsDto';
import { SwapPathUpdateDto } from './dto/SwapPathUpdateDto';
import { SwapPathsService } from './swap-paths.service';

@Controller()
@ApiTags('SwapPaths')
@UseGuards(AuthGuard, RolesGuard)
@UseInterceptors(RollbarInterceptor, AuthAccountInterceptor)
@ApiBearerAuth()
@ApiBadRequestResponse({
  type: ErrorResponseDto,
})
export class SwapPathsController {
  constructor(private swapPathsService: SwapPathsService) {}

  @Get('swap-paths')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение путей обмена',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwapPathListDto,
  })
  getSwapPaths(
    @Query() data: SwapPathListOptionsDto,
  ): Promise<SwapPathListDto> {
    return this.swapPathsService.getItems(data);
  }

  @Get('swap-paths/:id')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Получение пути обмена для пары по id',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwapPathDto,
  })
  getSwapPathById(@Param('id', ParseIntPipe) id: number): Promise<SwapPathDto> {
    return this.swapPathsService.getSwapPathById(id);
  }

  @Post('swap-paths')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Добавление пути обмена для пары',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwapPathDto,
  })
  createSwapPath(@Body() data: SwapPathCreateDto): Promise<SwapPathDto> {
    return this.swapPathsService.createSwapPath(data);
  }

  @Put('swap-paths/create/for/all/farms')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Создает пути обмена для всех пар фарминга, если их еще не было',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwapPathDto,
    isArray: true,
  })
  garanteeSwapPathsForFarms(): Promise<SwapPathDto[]> {
    return this.swapPathsService.garanteeSwapPathsForFarms();
  }

  @Put('swap-paths/:id')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Изменение пути обмена для пары',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SwapPathDto,
  })
  updateSwapPath(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: SwapPathUpdateDto,
  ): Promise<SwapPathDto> {
    return this.swapPathsService.updateSwapPathById(id, data);
  }

  @Delete('swap-paths/:id')
  @Roles(ACCOUNT_ROLES.ADMIN)
  @ApiOperation({
    summary: 'Удаление пути обмена для пары',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  removeSwapPath(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.swapPathsService.removeSwapPathById(id);
  }
}
