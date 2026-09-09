import { describe, it, expect, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { validateBusinessInput } from '../business.middleware.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';

function call(body: unknown) {
  const req = { body } as unknown as Request;
  const res = { locals: {} } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { run: () => validateBusinessInput(req, res, next), res, next };
}

describe('business.middleware', () => {
  it('passes through and stores the validated body', () => {
    const { run, res, next } = call({ name: 'My Shop', currencyCode: 'USD' });

    run();

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.locals.validated).toEqual({ name: 'My Shop', currencyCode: 'USD' });
  });

  it('stores an uppercase currencyCode on the validated body', () => {
    const { run, res, next } = call({ name: 'My Shop', currencyCode: 'usd' });

    run();

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.locals.validated).toEqual({ name: 'My Shop', currencyCode: 'USD' });
  });

  it('rejects an invalid body with field details', () => {
    const { run, res, next } = call({ name: '', currencyCode: 'USDX' });

    expect(run).toThrow(
      new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, {
        name: 'Business name is required',
        currencyCode: 'Enter a valid 3-letter ISO currency code',
      }),
    );
    expect(next).not.toHaveBeenCalled();
    expect(res.locals.validated).toBeUndefined();
  });
});
