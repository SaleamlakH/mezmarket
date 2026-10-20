import { describe, it, expect } from 'vitest';
import { validateUpdateProduct, validateUpdateProductActive } from '../../parser.js';
import { updateProductActiveSchema, updateProductSchema } from '../fields.schema.js';

/** The full-replace payload a product edit writes when a field is left empty. */
const productFields = {
  name: 'Shirt',
  brand: null,
  description: null,
  lowStockThreshold: null,
  trackAsPartial: false,
  categoryId: null,
};

describe('validateUpdateProduct', () => {
  it('writes every product field on a full replace', () => {
    const result = validateUpdateProduct({ name: 'Shirt XL' });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ ...productFields, name: 'Shirt XL' });
  });

  it('clears a nullable text field when it is blank', () => {
    const result = validateUpdateProduct({ name: 'Shirt', brand: '' });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ ...productFields, brand: null });
  });

  it('keeps an explicit null as a clear', () => {
    const result = validateUpdateProduct({ name: 'Shirt', description: null });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ ...productFields, description: null });
  });

  it('clears the low stock threshold when blank and coerces it from text', () => {
    expect(validateUpdateProduct({ name: 'Shirt', lowStockThreshold: '' }).data).toEqual(
      productFields,
    );
    expect(validateUpdateProduct({ name: 'Shirt', lowStockThreshold: ' 5 ' }).data).toEqual({
      ...productFields,
      lowStockThreshold: 5,
    });
  });

  it('requires the name on a full replace', () => {
    expect(validateUpdateProduct({}).errors?.name).toEqual(expect.any(String));
    expect(validateUpdateProduct({ name: '   ' }).errors?.name).toEqual(expect.any(String));
  });

  it('refuses unknown keys, including units and the image', () => {
    expect(validateUpdateProduct({ name: 'Shirt', active: false }).errors).not.toBeNull();
    expect(
      validateUpdateProduct({ name: 'Shirt', units: [{ id: 'pu-1', price: 5 }] }).errors,
    ).not.toBeNull();
    expect(validateUpdateProduct({ name: 'Shirt', uploadId: 'u-1' }).errors).not.toBeNull();
  });
});

describe('updateProductSchema', () => {
  it('parses on its own, so a form resolver can read it', () => {
    expect(updateProductSchema.parse({ name: 'Shirt' })).toEqual(productFields);
  });
});

describe('validateUpdateProductActive', () => {
  it('accepts a deactivate request', () => {
    const result = validateUpdateProductActive({ active: false });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ active: false });
  });

  it('accepts a reactivate request', () => {
    const result = validateUpdateProductActive({ active: true });

    expect(result.errors).toBeNull();
    expect(result.data).toEqual({ active: true });
  });

  it('refuses a missing active flag', () => {
    const result = validateUpdateProductActive({});

    expect(result.errors?.active).toBeDefined();
  });

  it('refuses a non-boolean active flag', () => {
    const result = validateUpdateProductActive({ active: 'yes' });

    expect(result.errors?.active).toBeDefined();
  });
});

describe('updateProductActiveSchema', () => {
  it('parses on its own, so a form resolver can read it', () => {
    expect(updateProductActiveSchema.parse({ active: true })).toEqual({ active: true });
  });
});
