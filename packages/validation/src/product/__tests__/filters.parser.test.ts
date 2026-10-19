import { describe, it, expect } from 'vitest';
import { validateProductListQuery } from '../../parser.js';
import { productListQuerySchema } from '../filters.schema.js';

describe('validateProductListQuery', () => {
  it('defaults to the active products when no status is given', () => {
    const result = validateProductListQuery({});

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ status: 'active' });
  });

  it('keeps the status a caller names', () => {
    const result = validateProductListQuery({ status: 'inactive' });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ status: 'inactive' });
  });

  it('accepts all, so the catalog can show every product', () => {
    const result = validateProductListQuery({ status: 'all' });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ status: 'all' });
  });

  it('normalizes a padded, cased status', () => {
    const result = validateProductListQuery({ status: '  ALL  ' });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ status: 'all' });
  });

  it('rejects a status that is not one of the three', () => {
    const result = validateProductListQuery({ status: 'archived' });

    expect(result.errors?.status).toBeDefined();
  });
});

describe('productListQuerySchema', () => {
  it('parses on its own, so a caller can read it directly', () => {
    expect(productListQuerySchema.parse({ status: 'inactive' })).toEqual({ status: 'inactive' });
  });

  it('fills in the default when parsed on its own', () => {
    expect(productListQuerySchema.parse({})).toEqual({ status: 'active' });
  });
});
