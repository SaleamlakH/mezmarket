import { describe, it, expect } from 'vitest';
import { validateCreateProduct } from '../parser.js';
import type { CreateProductFormValues } from '../schema/product.schema.js';

function validProduct(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Shirt',
    baseUnit: { unitId: 'kg-1', dimensionId: 'd-1', price: '120.50' },
    ...overrides,
  } as CreateProductFormValues;
}

describe('validateCreateProduct', () => {
  it('accepts a minimal valid product', () => {
    const result = validateCreateProduct(validProduct());

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      name: 'Shirt',
      baseUnit: { unitId: 'kg-1', price: 120.5 },
    });
  });

  it('accepts a product with a MOU in a different dimension', () => {
    const result = validateCreateProduct(
      validProduct({
        brand: 'Nike',
        description: 'Cotton t-shirt',
        trackAsPartial: false,
        lowStockThreshold: 5,
        uploadId: 'u-1',
        baseUnit: { unitId: 'kg-1', dimensionId: 'd-1', price: '120.50' },
        mou: { unitId: 'pc-1', dimensionId: 'd-2', conversionRate: 10, price: 15 },
      }),
    );

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({
      name: 'Shirt',
      brand: 'Nike',
      description: 'Cotton t-shirt',
      trackAsPartial: false,
      lowStockThreshold: 5,
      uploadId: 'u-1',
      baseUnit: { unitId: 'kg-1', price: 120.5 },
      mou: { unitId: 'pc-1', conversionRate: 10, price: 15 },
    });
  });

  it('strips the dimensionId from both unit outputs', () => {
    const result = validateCreateProduct(
      validProduct({
        mou: { unitId: 'pc-1', dimensionId: 'd-2', conversionRate: 10 },
      }),
    );
    const data = result.data as Record<string, unknown>;

    expect(data.baseUnit).not.toHaveProperty('dimensionId');
    expect(data.mou as Record<string, unknown>).not.toHaveProperty('dimensionId');
  });

  it('allows an integer price string of "0" style trimmed values', () => {
    const result = validateCreateProduct({
      name: 'Shirt',
      baseUnit: { unitId: 'kg-1', dimensionId: 'd-1', price: ' 50 ' },
    });

    expect(result.errors).toBeNull();
    expect(result.data?.baseUnit.price).toBe(50);
  });

  it('rejects an empty name', () => {
    const result = validateCreateProduct(validProduct({ name: '' }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ name: expect.any(String) });
  });

  it('rejects a name over 100 characters', () => {
    const result = validateCreateProduct(validProduct({ name: 'a'.repeat(101) }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ name: expect.any(String) });
  });

  it('rejects a missing baseUnit', () => {
    const result = validateCreateProduct({ name: 'Shirt' } as CreateProductFormValues);

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ baseUnit: expect.any(String) });
  });

  it('rejects an undefined baseUnit', () => {
    const result = validateCreateProduct(validProduct({ baseUnit: undefined }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ baseUnit: expect.any(String) });
  });

  it('rejects a non-decimal price string', () => {
    const result = validateCreateProduct(
      validProduct({
        baseUnit: { unitId: 'kg-1', dimensionId: 'd-1', price: 'abc' },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ 'baseUnit.price': expect.any(String) });
  });

  it('accepts a price string with more than two decimals', () => {
    const result = validateCreateProduct(
      validProduct({
        baseUnit: { unitId: 'kg-1', dimensionId: 'd-1', price: '10.123' },
      }),
    );

    expect(result.errors).toBeNull();
    expect(result.data?.baseUnit.price).toBe(10.123);
  });

  it('rejects a zero price', () => {
    const result = validateCreateProduct(
      validProduct({
        baseUnit: { unitId: 'kg-1', dimensionId: 'd-1', price: '0' },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ 'baseUnit.price': expect.any(String) });
  });

  it('rejects a negative price', () => {
    const result = validateCreateProduct(
      validProduct({
        baseUnit: { unitId: 'kg-1', dimensionId: 'd-1', price: '-5' },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ 'baseUnit.price': expect.any(String) });
  });

  it('rejects an undefined price', () => {
    const result = validateCreateProduct(
      validProduct({
        baseUnit: { unitId: 'kg-1', dimensionId: 'd-1', price: undefined },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ 'baseUnit.price': expect.any(String) });
  });

  it('rejects a missing dimensionId on the base unit', () => {
    const result = validateCreateProduct(
      validProduct({
        baseUnit: { unitId: 'kg-1', price: '120.50' },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({
      'baseUnit.dimensionId': expect.any(String),
    });
  });

  it('rejects an undefined dimensionId on the base unit', () => {
    const result = validateCreateProduct(
      validProduct({
        baseUnit: { unitId: 'kg-1', dimensionId: undefined, price: '120.50' },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({
      'baseUnit.dimensionId': expect.any(String),
    });
  });

  it('rejects an undefined unitId on the base unit', () => {
    const result = validateCreateProduct(
      validProduct({
        baseUnit: { unitId: undefined, dimensionId: 'd-1', price: '120.50' },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ 'baseUnit.unitId': expect.any(String) });
  });

  it('rejects an undefined name', () => {
    const result = validateCreateProduct(validProduct({ name: undefined }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ name: expect.any(String) });
  });

  it('rejects a negative conversion rate on the MOU', () => {
    const result = validateCreateProduct(
      validProduct({
        mou: { unitId: 'pc-1', dimensionId: 'd-2', conversionRate: -1 },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({
      'mou.conversionRate': expect.any(String),
    });
  });

  it('rejects an undefined conversionRate on the MOU', () => {
    const result = validateCreateProduct(
      validProduct({
        mou: { unitId: 'pc-1', dimensionId: 'd-2', conversionRate: undefined },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({
      'mou.conversionRate': expect.any(String),
    });
  });

  it('rejects a MOU in the same dimension as the base unit', () => {
    const result = validateCreateProduct(
      validProduct({
        mou: { unitId: 'g-1', dimensionId: 'd-1', conversionRate: 1000 },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ 'mou.dimensionId': expect.any(String) });
  });

  it('rejects an MOU equal to the base unit', () => {
    const result = validateCreateProduct(
      validProduct({
        mou: { unitId: 'kg-1', dimensionId: 'd-2', conversionRate: 1 },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ 'mou.unitId': expect.any(String) });
  });

  it('rejects trackAsPartial without an MOU', () => {
    const result = validateCreateProduct(validProduct({ trackAsPartial: true }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ mou: expect.any(String) });
  });

  it('accepts trackAsPartial when an MOU is provided', () => {
    const result = validateCreateProduct(
      validProduct({
        trackAsPartial: true,
        mou: { unitId: 'pc-1', dimensionId: 'd-2', conversionRate: 10 },
      }),
    );

    expect(result.errors).toBeNull();
  });

  it('returns the root error when the whole payload is undefined', () => {
    const result = validateCreateProduct(undefined as unknown as CreateProductFormValues);

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ _root: expect.any(String) });
  });

  it('rejects unknown top-level fields', () => {
    const result = validateCreateProduct(validProduct({ id: 'product-1' }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ _root: expect.any(String) });
  });

  it('rejects unknown fields inside the base unit', () => {
    const result = validateCreateProduct(
      validProduct({
        baseUnit: { unitId: 'kg-1', dimensionId: 'd-1', price: '120.50', symbol: 'kg' },
      }),
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ baseUnit: expect.any(String) });
  });

  it('rejects a negative low stock threshold', () => {
    const result = validateCreateProduct(validProduct({ lowStockThreshold: -1 }));

    expect(result.data).toBeNull();
    expect(result.errors).toEqual({ lowStockThreshold: expect.any(String) });
  });
});
