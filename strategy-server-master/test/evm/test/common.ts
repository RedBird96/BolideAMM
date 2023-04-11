import { sleep } from 'test/helpers/sleep';

export const prepareNodeTime = async () => sleep(3000);

// https://stackoverflow.com/a/72384571/10432429
export const getRandomDbName = () => (Date.now() * Math.random()).toString(16);
