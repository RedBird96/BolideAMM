import type { ORDER } from '../constants/order';

export interface PageOptions {
  order?: ORDER;
  orderField?: string;
  page: number;
  take: number;
}
