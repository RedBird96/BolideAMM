import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, ForbiddenException } from '@nestjs/common';
import Cookies from 'cookies';
import type { Request, Response } from 'express';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import type { ErrorResponse } from 'src/common/error-response';
import { ConfigService } from 'src/shared/services/config.service';

const configService = new ConfigService();

@Catch(ForbiddenException)
export class ForbiddenExceptionFilter implements ExceptionFilter {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  catch(exception: ForbiddenException, host: ArgumentsHost): void {
    // console.log('FORBIDDEN EXCEPTION');

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
          text: ERROR_CODES.NO_ACCESS.text,
          code: ERROR_CODES.NO_ACCESS.code,
        },
      ],
    };

    response.status(403).json(errorResponse);
  }
}
