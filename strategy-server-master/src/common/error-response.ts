export interface ErrorMessage {
  code: string;
  text: string;
  target?: Record<string, string | number | boolean>;
  value?: string | number | boolean;
  property?: string;
  childred?: [];
  constraints?: Record<string, string>;
}

export interface ErrorResponse {
  timestamp: string;
  url: string;
  messages: ErrorMessage[];
}
