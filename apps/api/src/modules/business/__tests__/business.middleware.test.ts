import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import {
  validateBusinessInput,
  validateBusinessUpdateInput,
  createAuthorizeBusiness,
  requireBusinessRole,
} from '../business.middleware.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import type {
  BusinessMemberRole,
  BusinessService,
  UpdateBusinessInput,
} from '../business.types.js';

/**
 * A thrown AppError pinned by code and status only. The message text is the
 * implementation's to word, so it is never matched literally.
 */
function appError(code: string, statusCode: number) {
  return expect.objectContaining({ code, statusCode, message: expect.any(String) });
}

type Middleware = (req: Request, res: Response, next: NextFunction) => void;

function call(middleware: Middleware, body: unknown) {
  const req = { body } as unknown as Request;
  const res = {} as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { run: () => middleware(req, res, next), req, next };
}

describe('business.middleware', () => {
  describe('validateBusinessInput', () => {
    it('passes through and stores the validated body', () => {
      const { run, req, next } = call(validateBusinessInput, {
        name: 'My Shop',
        currencyCode: 'USD',
      });

      run();

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.validBody).toEqual({ name: 'My Shop', currencyCode: 'USD' });
    });

    it('stores an uppercase currencyCode on the validated body', () => {
      const { run, req, next } = call(validateBusinessInput, {
        name: 'My Shop',
        currencyCode: 'usd',
      });

      run();

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.validBody).toEqual({ name: 'My Shop', currencyCode: 'USD' });
    });

    it('rejects an invalid body with field details', () => {
      const { run, req, next } = call(validateBusinessInput, {
        name: '',
        currencyCode: 'USDX',
      });

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

  describe('validateBusinessUpdateInput', () => {
    const input: UpdateBusinessInput = {
      name: 'Shop v2',
      currencyCode: 'usd',
      defaultTaxRate: 15,
      taxOnSales: true,
      allowNegativeStock: false,
      lowStockDefaultThreshold: 10,
    };

    it('passes through and stores the validated update body', () => {
      const { run, req, next } = call(validateBusinessUpdateInput, input);

      run();

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.validBody).toEqual({ ...input, currencyCode: 'USD' });
    });

    it('passes through when only the required fields are sent', () => {
      const { run, req, next } = call(validateBusinessUpdateInput, {
        name: 'Shop',
        currencyCode: 'USD',
      });

      run();

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.validBody).toEqual({ name: 'Shop', currencyCode: 'USD' });
    });

    it('rejects an invalid body with field details', () => {
      const { run, req, next } = call(validateBusinessUpdateInput, {
        name: '',
        currencyCode: 'USDX',
      });

      expect(run).toThrow(
        new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, {
          name: expect.any(String),
          currencyCode: expect.any(String),
        }),
      );
      expect(next).not.toHaveBeenCalled();
      expect(req.validBody).toBeUndefined();
    });

    it('rejects a non-boolean allowNegativeStock', () => {
      const { run } = call(validateBusinessUpdateInput, {
        name: 'Shop',
        currencyCode: 'USD',
        allowNegativeStock: 'yes',
      });

      expect(run).toThrow(
        new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, {
          allowNegativeStock: expect.any(String),
        }),
      );
    });
  });
});

describe('createAuthorizeBusiness', () => {
  function mockService(): BusinessService {
    return {
      getBusinesses: vi.fn(),
      createBusiness: vi.fn(),
      resolveScope: vi.fn(),
      getBusiness: vi.fn(),
      updateBusiness: vi.fn(),
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

  it('attaches the resolved scope and acting member to req.auth and calls next', async () => {
    const { service, req, next, run } = call({ ownerId: 'owner-1', businessId: 'b-1' });
    vi.mocked(service.resolveScope).mockResolvedValue({
      businessId: 'b-1',
      branchId: 'br-1',
      memberId: 'm-1',
      role: 'OWNER',
    });

    await run();

    expect(service.resolveScope).toHaveBeenCalledWith('owner-1', 'b-1');
    expect(req.auth).toEqual({
      ownerId: 'owner-1',
      businessId: 'b-1',
      branchId: 'br-1',
      memberId: 'm-1',
      role: 'OWNER',
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('throws UNAUTHORIZED when the owner id is missing', async () => {
    const { service, next, run } = call({ businessId: 'b-1' });

    await expect(run()).rejects.toEqual(appError(ERROR_CODES.UNAUTHORIZED, 401));
    expect(service.resolveScope).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('throws BAD_REQUEST when the business id is missing', async () => {
    const { service, next, run } = call({ ownerId: 'owner-1' });

    await expect(run()).rejects.toEqual(appError(ERROR_CODES.BAD_REQUEST, 400));
    expect(service.resolveScope).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('leaves req.auth unchanged and does not call next when the business is not owned', async () => {
    const { service, req, next, run } = call({ ownerId: 'owner-1', businessId: 'b-1' });
    vi.mocked(service.resolveScope).mockRejectedValue(
      new AppError(ERROR_CODES.NOT_FOUND, expect.any(String), 404),
    );

    await expect(run()).rejects.toEqual(appError(ERROR_CODES.NOT_FOUND, 404));
    expect(req.auth).toEqual({ ownerId: 'owner-1' });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireBusinessRole', () => {
  const WRITE_ROLES: BusinessMemberRole[] = ['OWNER', 'MANAGER'];

  function call(role: BusinessMemberRole | undefined) {
    const middleware = requireBusinessRole(WRITE_ROLES);
    const req = {
      auth: role !== undefined ? { ownerId: 'owner-1', memberId: 'm-1', role } : undefined,
    } as unknown as Request;
    const res = {} as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { req, res, next, run: () => middleware(req, res, next) };
  }

  it.each(['OWNER', 'MANAGER'] as const)('lets %s through', (role) => {
    const { next, run } = call(role);

    run();

    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each(['CASHIER', 'SERVER'] as const)('refuses %s with FORBIDDEN', (role) => {
    const { next, run } = call(role);

    expect(run).toThrow(appError(ERROR_CODES.FORBIDDEN, 403));
    expect(next).not.toHaveBeenCalled();
  });

  it('treats a request with no resolved role as unauthenticated rather than forbidden', () => {
    const { next, run } = call(undefined);

    expect(run).toThrow(appError(ERROR_CODES.UNAUTHORIZED, 401));
    expect(next).not.toHaveBeenCalled();
  });
});
