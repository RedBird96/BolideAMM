import { PLATFORMS } from '../constants/platforms';

export const getPlatformByName = (name: string): PLATFORMS => {
  switch (name.toUpperCase()) {
    case 'APESWAP':
      return PLATFORMS.APESWAP;

    case 'PANCAKE':
      return PLATFORMS.PANCAKESWAP;

    case 'BISWAP':
      return PLATFORMS.BISWAP;

    default:
      throw new Error(`cannot recognize platfotm by name: ${name}`);
  }
};
