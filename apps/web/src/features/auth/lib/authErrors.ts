export class AuthFlowError extends Error {
  readonly code: string | undefined;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AuthFlowError';
    this.code = code;
  }
}

export function toAuthFlowError(error: {
  message: string;
  code?: string | null | undefined;
}): AuthFlowError {
  return new AuthFlowError(error.message, error.code ?? undefined);
}

export function isAuthFlowError(error: unknown, code?: string): error is AuthFlowError {
  return error instanceof AuthFlowError && (code === undefined || error.code === code);
}
