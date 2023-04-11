export interface AMQErrorResponse {
  [key: string]: unknown;
  isError?: boolean;
  messages?: any[];
}
