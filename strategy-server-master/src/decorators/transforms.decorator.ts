import { Transform } from 'class-transformer';
import { castArray, isArray, isNil, trim } from 'lodash';

/**
 * @description trim spaces from start and end, replace multiple spaces with one.
 * @example
 * @ApiProperty()
 * @IsString()
 * @Trim()
 * name: string;
 * @returns {(target: any, key: string) => void}
 * @constructor
 */
export function Trim(): any {
  return Transform((params) => {
    if (isArray(params.value)) {
      return params.value.map((v) => trim(v).replace(/\s\s+/g, ' '));
    }

    return trim(params.value).replace(/\s\s+/g, ' ');
  });
}

/**
 * @description convert string or number to integer
 * @example
 * @IsNumber()
 * @ToInt()
 * name: number;
 * @returns {(target: any, key: string) => void}
 * @constructor
 */
export function ToInt(): any {
  return Transform((params) => Number.parseInt(params.value, 10), {
    toClassOnly: true,
  });
}

/**
 * @description transforms to array, specially for query params
 * @example
 * @IsNumber()
 * @ToArray()
 * name: number;
 * @constructor
 */
export function ToArray(): (target: any, key: string) => void {
  return Transform(
    (params) => {
      if (isNil(params.value)) {
        return [];
      }

      return castArray(params.value);
    },
    { toClassOnly: true },
  );
}
