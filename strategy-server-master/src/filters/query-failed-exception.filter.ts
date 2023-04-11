import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import type { ErrorResponse } from 'src/common/error-response';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class QueryFailedExceptionFilter implements ExceptionFilter {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  catch(exception: any, host: ArgumentsHost) {
    // console.log('QUERY FAILED EXCEPTION');

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const { url } = request;

    const errorResponse: ErrorResponse = {
      url,
      timestamp: new Date().toISOString(),
      messages: [
        {
          text: `${exception.toString()}. ${exception.detail}`,
          code: ERROR_CODES.PG.code,
          value: exception.parameters || null,
        },
      ],
    };

    response.status(500).json(errorResponse);
  }
}
