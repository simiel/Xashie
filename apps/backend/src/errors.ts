export type ErrorCode =
  | 'bad_request'
  | 'conflicting_credentials'
  | 'forbidden'
  | 'invalid_credentials'
  | 'not_found'
  | 'rate_limited'
  | 'service_not_configured'
  | 'service_unavailable'
  | 'unauthorized'
  | 'upgrade_conflict'
  | 'validation_error';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly headers: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class StoreError extends Error {
  constructor(
    public readonly code: 'not_configured' | 'unavailable' | 'conflict' | 'inactive',
    message: string,
  ) {
    super(message);
    this.name = 'StoreError';
  }
}

export class AuthServiceError extends Error {
  constructor(public readonly code: 'not_configured' | 'unavailable') {
    super('Clerk verification is not configured.');
    this.name = 'AuthServiceError';
  }
}
