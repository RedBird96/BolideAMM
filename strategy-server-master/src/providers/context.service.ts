import * as requestContext from 'request-context';

export class ContextService {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static readonly _nameSpace = 'request';

  static get<T>(key: string): T {
    return requestContext.get(ContextService._getKeyWithNamespace(key));
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  static set(key: string, value: any): void {
    requestContext.set(ContextService._getKeyWithNamespace(key), value);
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static _getKeyWithNamespace(key: string): string {
    return `${ContextService._nameSpace}.${key}`;
  }
}
