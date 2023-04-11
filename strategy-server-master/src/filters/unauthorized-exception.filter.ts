import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, UnauthorizedException } from '@nestjs/common';
import Cookies from 'cookies';
import type { Request, Response } from 'express';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import type { ErrorResponse } from 'src/common/error-response';
import { ConfigService } from 'src/shared/services/config.service';

const configService = new ConfigService();

@Catch(UnauthorizedException)
export class UnauthorizedExceptionFilter implements ExceptionFilter {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  catch(exception: UnauthorizedException, host: ArgumentsHost): void {
    // console.log('UNAUTHORIZED EXCEPTION');

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const { url } = request;

    const cookies = Cookies(request, response as any);

    cookies.set(configService.accessTokenCookieName, null, {
      httpOnly: true,
      maxAge: 0,
      overwrite: true,
      domain: configService.getCookieDomain(),
    });

    const errorResponse: ErrorResponse = {
      url,
      timestamp: new Date().toISOString(),
      messages: [
        {
          text: ERROR_CODES.AUTH.text,
          code: ERROR_CODES.AUTH.code,
        },
      ],
    };

    response.status(401).json(errorResponse);
  }
}
