/* eslint-disable max-classes-per-file */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { ErrorMessage, ErrorResponse } from '../error-response';

class ErrorMessageDto implements ErrorMessage {
  @ApiProperty()
  readonly code: string;

  @ApiProperty()
  readonly text: string;

  @ApiPropertyOptional()
  readonly target: any;

  @ApiPropertyOptional()
  readonly value: string | number | boolean;

  @ApiPropertyOptional()
  readonly childred: [];

  @ApiPropertyOptional()
  readonly constraints: any;
}

export class ErrorResponseDto implements ErrorResponse {
  @ApiProperty()
  readonly timestamp: string;

  @ApiProperty()
  readonly url: string;

  @ApiProperty({
    type: [ErrorMessageDto],
  })
  readonly messages: ErrorMessageDto[];
}
