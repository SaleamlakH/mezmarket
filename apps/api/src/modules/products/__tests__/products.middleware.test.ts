import { describe, it, expect, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { createUploadResolver, validateProductInput } from '../products.middleware.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import type { ProductService } from '../products.types.js';

function mockService(): ProductService {
  return {
    listProducts: vi.fn(),
    listProductUnits: vi.fn(),
    getProduct: vi.fn(),
    createProduct: vi.fn(),
    resolveUploadId: vi.fn(),
    resolveUploadIds: vi.fn(),
  };
}

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    method: 'GET',
    path: '/uploads/urls',
    params: {},
    auth: { ownerId: 'owner-1', businessId: 'b-1', branchId: 'br-1' },
    ...overrides,
  } as unknown as Request;
}

describe('validateProductInput', () => {
  function call(body: unknown) {
    const req = { body } as unknown as Request;
    const res = {} as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { run: () => validateProductInput(req, res, next), req, next };
  }

  it('passes through and stores the validated product on req.validBody', () => {
    const { run, req, next } = call({
      name: 'Shirt',
      baseUnit: { unitId: 'kg-1', price: '120.50' },
    });

    run();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.validBody).toEqual({
      brand: null,
      description: null,
      lowStockThreshold: null,
      trackAsPartial: false,
      categoryId: null,
      name: 'Shirt',
      baseUnit: { unitId: 'kg-1', price: 120.5 },
    });
  });

  it('rejects an invalid body with field details', () => {
    const { run, next } = call({
      name: '',
      baseUnit: { unitId: 'kg-1', price: '120.50' },
    });

    expect(run).toThrow(
      new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, {
        name: expect.any(String),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a payload missing the base unit', () => {
    const { run, next } = call({ name: 'Shirt' });

    expect(run).toThrow(
      new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, {
        baseUnit: expect.any(String),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});

describe('products.middleware', () => {
  it('skips resolution for POST requests', async () => {
    const service = mockService();
    const resolveUploads = createUploadResolver(service);
    const next = vi.fn();

    await resolveUploads(mockReq({ method: 'POST', path: '/uploads' }), {} as Response, next);

    expect(service.resolveUploadId).not.toHaveBeenCalled();
    expect(service.resolveUploadIds).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });

  it('resolves all upload ids for the batch route', async () => {
    const service = mockService();
    vi.mocked(service.resolveUploadIds).mockResolvedValue(['u-1', 'u-2']);
    const resolveUploads = createUploadResolver(service);
    const req = mockReq({ path: '/uploads/urls' });
    const next = vi.fn();

    await resolveUploads(req, {} as Response, next);

    expect(service.resolveUploadIds).toHaveBeenCalledWith('b-1', 'br-1');
    expect((req as Request & { uploadIds?: string[] }).uploadIds).toEqual(['u-1', 'u-2']);
    expect(next).toHaveBeenCalledOnce();
  });

  it('resolves the upload id for a scoped record param', async () => {
    const service = mockService();
    vi.mocked(service.resolveUploadId).mockResolvedValue('u-1');
    const resolveUploads = createUploadResolver(service);
    const req = mockReq({
      path: '/p-1/uploads/u-1/url',
      params: { recordId: 'p-1', uploadId: 'u-1' },
    });
    const next = vi.fn();

    await resolveUploads(req, {} as Response, next);

    expect(service.resolveUploadId).toHaveBeenCalledWith('p-1', 'b-1');
    expect(req.params.uploadId).toBe('u-1');
    expect(next).toHaveBeenCalledOnce();
  });
});
