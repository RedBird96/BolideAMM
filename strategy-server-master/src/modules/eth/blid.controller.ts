import { Controller, Get, HttpStatus, UseInterceptors } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from 'src/common/dto/ErrorResponseDto';
import { RollbarInterceptor } from 'src/interceptors/rollbar-interceptor.service';

import { BlidEthService } from './blid-eth.service';
import { GetBlidOnAddressesDto } from './dto/GetBlidOnAddressesDto';
import { EthWeb3Service } from './eth-web3.service';

@Controller()
@ApiTags('ETH')
@UseInterceptors(RollbarInterceptor)
@ApiBadRequestResponse({
  type: ErrorResponseDto,
})
export class BlidController {
  constructor(
    private blidEthService: BlidEthService,
    private ethWeb3Service: EthWeb3Service,
  ) {}

  @Get('eth/blid/on/addresses/')
  @ApiOperation({
    summary: 'Получить количество blid на наших адресах в mainnet',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: GetBlidOnAddressesDto,
  })
  async getBlidOnAddresses(): Promise<GetBlidOnAddressesDto> {
    const web3 = await this.ethWeb3Service.createInstance();

    return this.blidEthService.getBlidOnAddressesFromWeiToString(web3);
  }

  @Get('eth/blid/total/supply/')
  @ApiOperation({
    summary: 'Общее количество токенов.',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  async getBlidTotalSupply(): Promise<string> {
    const web3 = await this.ethWeb3Service.createInstance();

    return this.blidEthService.getBlidTotalSupply(web3);
  }

  @Get('eth/blid/circulating/supply/')
  @ApiOperation({
    summary:
      'Количество токенов которые находятся в обращении в публичных руках',
    description: '',
  })
  @ApiResponse({
    status: HttpStatus.OK,
  })
  async getBlidCirculatingSupply(): Promise<string> {
    const web3 = await this.ethWeb3Service.createInstance();

    return this.blidEthService.getBlidCirculatingSupply(web3);
  }
}
