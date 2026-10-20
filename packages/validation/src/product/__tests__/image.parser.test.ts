import { describe, it, expect } from 'vitest';
import { productImageSchema } from '../image.schema.js';

describe('productImageSchema', () => {
  it('keeps the upload a product carries', () => {
    expect(productImageSchema.parse('u-1')).toBe('u-1');
  });

  it('reads a blank image as no photo', () => {
    expect(productImageSchema.parse('   ')).toBeUndefined();
  });

  it('reads a missing image as no photo', () => {
    expect(productImageSchema.parse(undefined)).toBeUndefined();
  });
});
