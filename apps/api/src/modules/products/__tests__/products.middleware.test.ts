import { describe, it, expect, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import {
  createUploadResolver,
  validateProductActiveInput,
  validateProductIdParam,
  validateProductInput,
  validateProductListFilters,
  validateProductUnitInput,
  validateProductUnitsUpdateInput,
  validateProductUpdateInput,
} from '../products.middleware.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import type { ProductService } from '../products.types.js';

function thrownBy(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }

  throw new Error('Expected the function to throw');
}

function mockService(): ProductService {
  return {
    listProducts: vi.fn(),
    listProductUnits: vi.fn(),
    getProduct: vi.fn(),
    createProduct: vi.fn(),
    createProductUnit: vi.fn(),
    updateProduct: vi.fn(),
    updateProductUnits: vi.fn(),
    setProductActive: vi.fn(),
    resolveUploadId: vi.fn(),
    resolveUploadTarget: vi.fn(),
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

    expect(thrownBy(run)).toMatchObject({
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: 400,
      message: expect.any(String),
      details: { name: expect.any(String) },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a payload missing the base unit', () => {
    const { run, next } = call({ name: 'Shirt' });

    expect(thrownBy(run)).toMatchObject({
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: 400,
      message: expect.any(String),
      details: { baseUnit: expect.any(String) },
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('validateProductUnitInput', () => {
  function call(body: unknown) {
    const req = { body } as unknown as Request;
    const res = {} as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { run: () => validateProductUnitInput(req, res, next), req, next };
  }

  it('passes through and stores the coerced unit on req.validBody', () => {
    const { run, req, next } = call({
      name: 'Shot',
      dependsOn: 'BASE',
      conversionRate: '25',
      sellCapable: true,
      price: '120.50',
    });

    run();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.validBody).toEqual({
      unitRole: 'CUSTOM',
      name: 'Shot',
      dependsOn: 'BASE',
      conversionRate: 25,
      purchaseCapable: true,
      sellCapable: true,
      price: 120.5,
    });
  });

  it('rejects a unit that can be sold with no price', () => {
    const { run, next } = call({
      name: 'Shot',
      dependsOn: 'BASE',
      conversionRate: '25',
      sellCapable: true,
    });

    expect(thrownBy(run)).toMatchObject({
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: 400,
      message: expect.any(String),
      details: { price: expect.any(String) },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an unknown field', () => {
    const { run, next } = call({
      name: 'Shot',
      dependsOn: 'BASE',
      conversionRate: '25',
      bogus: 'x',
    });

    expect(run).toThrow(AppError);
    expect(next).not.toHaveBeenCalled();
  });

  it('reads a body with no role as a custom unit', () => {
    const { run, req, next } = call({
      name: 'Shot',
      dependsOn: 'BASE',
      conversionRate: '25',
      sellCapable: false,
    });

    run();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.validBody).toMatchObject({ unitRole: 'CUSTOM', name: 'Shot' });
  });

  it('accepts a content unit named by a standard unit', () => {
    const { run, req, next } = call({
      unitRole: 'MOU',
      unitId: 'unit-ml',
      conversionRate: '750',
      price: '40',
    });

    run();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.validBody).toEqual({
      unitRole: 'MOU',
      unitId: 'unit-ml',
      conversionRate: 750,
      price: 40,
    });
  });
});

describe('validateProductUpdateInput', () => {
  function call(body: unknown) {
    const req = { body } as unknown as Request;
    const res = {} as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { run: () => validateProductUpdateInput(req, res, next), req, next };
  }

  it('passes through and stores the validated fields on req.validBody', () => {
    const { run, req, next } = call({ name: 'Shirt', lowStockThreshold: 5 });

    run();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.validBody).toEqual({
      name: 'Shirt',
      categoryId: null,
      brand: null,
      description: null,
      trackAsPartial: false,
      lowStockThreshold: 5,
    });
  });

  it('rejects a body with no fields to change', () => {
    const { run, next } = call({});

    expect(run).toThrow(AppError);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an invalid field with field details', () => {
    const { run, next } = call({ name: '' });

    expect(thrownBy(run)).toMatchObject({
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: 400,
      message: expect.any(String),
      details: { name: expect.any(String) },
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('validateProductUnitsUpdateInput', () => {
  function call(body: unknown) {
    const req = { body } as unknown as Request;
    const res = {} as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { run: () => validateProductUnitsUpdateInput(req, res, next), req, next };
  }

  it('passes through and stores the validated units on req.validBody', () => {
    const { run, req, next } = call({
      units: [{ unitRole: 'BASE', id: 'pu-1', price: '80' }],
    });

    run();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.validBody).toEqual({ units: [{ unitRole: 'BASE', id: 'pu-1', price: 80 }] });
  });

  it('rejects a unit without an id', () => {
    const { run, next } = call({ units: [{ unitRole: 'BASE', price: 80 }] });

    expect(thrownBy(run)).toMatchObject({
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: 400,
      message: expect.any(String),
      details: { 'units.0.id': expect.any(String) },
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('validateProductActiveInput', () => {
  function call(body: unknown) {
    const req = { body } as unknown as Request;
    const res = {} as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { run: () => validateProductActiveInput(req, res, next), req, next };
  }

  it('passes through and stores the flag on req.validBody', () => {
    const { run, req, next } = call({ active: false });

    run();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.validBody).toEqual({ active: false });
  });

  it('rejects a body without the flag', () => {
    const { run, next } = call({});

    expect(thrownBy(run)).toMatchObject({
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: 400,
      message: expect.any(String),
      details: { active: expect.any(String) },
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('validateProductIdParam', () => {
  function call(params: Request['params']) {
    const req = { params } as unknown as Request;
    const res = {} as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { run: () => validateProductIdParam(req, res, next), req, next };
  }

  it('passes through and normalizes the product id on req.params', () => {
    const { run, req, next } = call({ productId: ['p-1', 'p-2'] } as never);

    run();

    expect(req.params.productId).toBe('p-1');
    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects a request without a product id', () => {
    const { run, next } = call({});

    expect(thrownBy(run)).toMatchObject({
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: 400,
      message: expect.any(String),
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('validateProductListFilters', () => {
  function call(query: unknown) {
    const req = { query } as unknown as Request;
    const res = {} as unknown as Response;
    const next = vi.fn() as NextFunction;
    return { run: () => validateProductListFilters(req, res, next), req, next };
  }

  it('defaults to the active products when no filter is given', () => {
    const { run, req, next } = call({});

    run();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.validQuery).toEqual({ status: 'active' });
  });

  it('passes the requested status through', () => {
    const { run, req, next } = call({ status: 'all' });

    run();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.validQuery).toEqual({ status: 'all' });
  });

  it('rejects an unknown status', () => {
    const { run, next } = call({ status: 'archived' });

    expect(thrownBy(run)).toMatchObject({
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: 400,
      message: expect.any(String),
      details: { status: expect.any(String) },
    });
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

  it('resolves the existing upload as the replacement target on PUT', async () => {
    const service = mockService();
    vi.mocked(service.resolveUploadTarget).mockResolvedValue({
      productId: 'p-1',
      uploadId: 'u-1',
    });
    const resolveUploads = createUploadResolver(service);
    const req = mockReq({ method: 'PUT', path: '/p-1/uploads', params: { recordId: 'p-1' } });
    const next = vi.fn();

    await resolveUploads(req, {} as Response, next);

    expect(service.resolveUploadTarget).toHaveBeenCalledWith('p-1', 'b-1');
    expect(req.params.uploadId).toBe('u-1');
    expect(next).toHaveBeenCalledOnce();
  });

  it('leaves the upload id unset on PUT when the product has no image yet', async () => {
    const service = mockService();
    vi.mocked(service.resolveUploadTarget).mockResolvedValue({ productId: 'p-1', uploadId: null });
    const resolveUploads = createUploadResolver(service);
    const req = mockReq({ method: 'PUT', path: '/p-1/uploads', params: { recordId: 'p-1' } });
    const next = vi.fn();

    await resolveUploads(req, {} as Response, next);

    expect(req.params.uploadId).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects a PUT without a record id', async () => {
    const service = mockService();
    const resolveUploads = createUploadResolver(service);
    const req = mockReq({ method: 'PUT', path: '/uploads', params: {} });

    await expect(resolveUploads(req, {} as Response, vi.fn())).rejects.toMatchObject({
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: 400,
      message: expect.any(String),
    });
    expect(service.resolveUploadTarget).not.toHaveBeenCalled();
  });
});
