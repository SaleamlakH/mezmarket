import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { validateBusinessInput, createAuthorizeBusiness } from '../business.middleware.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import type { BusinessService } from '../business.types.js';

function call(body: unknown) {
  const req = { body } as unknown as Request;
  const res = {} as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { run: () => validateBusinessInput(req, res, next), req, next };
}

describe('business.middleware', () => {
  it('passes through and stores the validated body', () => {
    const { run, req, next } = call({ name: 'My Shop', currencyCode: 'USD' });

    run();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.validBody).toEqual({ name: 'My Shop', currencyCode: 'USD' });
  });

  it('stores an uppercase currencyCode on the validated body', () => {
    const { run, req, next } = call({ name: 'My Shop', currencyCode: 'usd' });

    run();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.validBody).toEqual({ name: 'My Shop', currencyCode: 'USD' });
  });

  it('rejects an invalid body with field details', () => {
    const { run, req, next } = call({ name: '', currencyCode: 'USDX' });

    expect(run).toThrow(
      new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, {
        name: 'Business name is required',
        currencyCode: 'Enter a valid 3-letter ISO currency code',
      }),
    );
    expect(next).not.toHaveBeenCalled();
    expect(req.validBody).toBeUndefined();
  });
});

describe('createAuthorizeBusiness', () => {
  function mockService(): BusinessService {
    return {
      getBusinesses: vi.fn(),
      createBusiness: vi.fn(),
      resolveScope: vi.fn(),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function call(overrides: { ownerId?: string; businessId?: string } = {}) {
    const service = mockService();
    const middleware = createAuthorizeBusiness(service);
    const req = {
      auth: overrides.ownerId !== undefined ? { ownerId: overrides.ownerId } : undefined,
      params: overrides.businessId !== undefined ? { businessId: overrides.businessId } : {},
    } as unknown as Request;
    const res = {} as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { service, req, res, next, run: () => middleware(req, res, next) };
  }

  it('attaches the resolved business and branch ids to req.auth and calls next', async () => {
    const { service, req, next, run } = call({ ownerId: 'owner-1', businessId: 'b-1' });
    vi.mocked(service.resolveScope).mockResolvedValue({ businessId: 'b-1', branchId: 'br-1' });

    await run();

    expect(service.resolveScope).toHaveBeenCalledWith('owner-1', 'b-1');
    expect(req.auth).toEqual({ ownerId: 'owner-1', businessId: 'b-1', branchId: 'br-1' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('throws UNAUTHORIZED when the owner id is missing', async () => {
    const { service, next, run } = call({ businessId: 'b-1' });

    await expect(run()).rejects.toEqual(
      new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
    );
    expect(service.resolveScope).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('throws BAD_REQUEST when the business id is missing', async () => {
    const { service, next, run } = call({ ownerId: 'owner-1' });

    await expect(run()).rejects.toEqual(
      new AppError(ERROR_CODES.BAD_REQUEST, 'Missing business id', 400),
    );
    expect(service.resolveScope).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('leaves req.auth unchanged and does not call next when the business is not owned', async () => {
    const { service, req, next, run } = call({ ownerId: 'owner-1', businessId: 'b-1' });
    vi.mocked(service.resolveScope).mockRejectedValue(
      new AppError(ERROR_CODES.NOT_FOUND, 'Business not found', 404),
    );

    await expect(run()).rejects.toEqual(
      new AppError(ERROR_CODES.NOT_FOUND, 'Business not found', 404),
    );
    expect(req.auth).toEqual({ ownerId: 'owner-1' });
    expect(next).not.toHaveBeenCalled();
  });
});
