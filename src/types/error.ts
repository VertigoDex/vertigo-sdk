// Error types
export enum SDKErrorType {
  InitializationError = "InitializationError",
  ValidationError = "ValidationError",
  TransactionError = "TransactionError",
  QuoteError = "QuoteError",
  NetworkError = "NetworkError",
}

export class SDKError extends Error {
  constructor(
    message: string,
    public type: SDKErrorType,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "SDKError";
    this.message = message;
    this.type = type;
    this.cause = cause;
  }
}
