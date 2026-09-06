import { describe, it, expect } from 'vitest';
import { validateCreateBusiness } from '../parser.js';

describe('parser', () => {
  describe('validateCreateBusiness', () => {
    it('should validate valid business creation values', () => {
      const result = validateCreateBusiness({ name: 'My Shop', currencyCode: 'USD' });

      expect(result.data).toEqual({ name: 'My Shop', currencyCode: 'USD' });
      expect(result.errors).toBeNull();
    });

    it('should accept optional fields when valid', () => {
      const result = validateCreateBusiness({
        name: 'My Shop',
        currencyCode: 'USD',
        defaultTaxRate: 15,
        taxDisplayMode: 'INCLUSIVE',
        lowStockDefaultThreshold: 10,
      });

      expect(result.data).toEqual({
        name: 'My Shop',
        currencyCode: 'USD',
        defaultTaxRate: 15,
        taxDisplayMode: 'INCLUSIVE',
        lowStockDefaultThreshold: 10,
      });
      expect(result.errors).toBeNull();
    });

    it('should trim whitespace around name', () => {
      const result = validateCreateBusiness({ name: '  My Shop  ', currencyCode: 'USD' });

      expect(result.data).toEqual({ name: 'My Shop', currencyCode: 'USD' });
    });

    it('should invalidate a missing name', () => {
      const result = validateCreateBusiness({ name: '', currencyCode: 'USD' });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ name: 'Business name is required' });
    });

    it('should invalidate a name longer than 20 characters', () => {
      const result = validateCreateBusiness({ name: 'A'.repeat(21), currencyCode: 'USD' });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({
        name: 'Business name must be at most 20 characters',
      });
    });

    it('should invalidate a missing currencyCode', () => {
      const result = validateCreateBusiness({ name: 'My Shop', currencyCode: '' });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ currencyCode: 'Currency is required' });
    });

    it('should uppercase a lowercase currencyCode', () => {
      const result = validateCreateBusiness({ name: 'My Shop', currencyCode: 'usd' });

      expect(result.data).toEqual({ name: 'My Shop', currencyCode: 'USD' });
      expect(result.errors).toBeNull();
    });

    it('should invalidate a currencyCode with the wrong length', () => {
      const result = validateCreateBusiness({ name: 'My Shop', currencyCode: 'USDX' });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({
        currencyCode: 'Enter a valid 3-letter ISO currency code',
      });
    });

    it('should invalidate a defaultTaxRate above 100', () => {
      const result = validateCreateBusiness({
        name: 'My Shop',
        currencyCode: 'USD',
        defaultTaxRate: 101,
      });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ defaultTaxRate: 'Tax rate must be at most 100' });
    });

    it('should invalidate a negative defaultTaxRate', () => {
      const result = validateCreateBusiness({
        name: 'My Shop',
        currencyCode: 'USD',
        defaultTaxRate: -1,
      });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ defaultTaxRate: 'Tax rate must be at least 0' });
    });

    it('should accept both valid taxDisplayMode values', () => {
      for (const taxDisplayMode of ['EXCLUSIVE', 'INCLUSIVE'] as const) {
        const result = validateCreateBusiness({
          name: 'My Shop',
          currencyCode: 'USD',
          taxDisplayMode,
        });

        expect(result.data).toEqual({ name: 'My Shop', currencyCode: 'USD', taxDisplayMode });
        expect(result.errors).toBeNull();
      }
    });

    it('should invalidate an invalid taxDisplayMode', () => {
      const result = validateCreateBusiness({
        name: 'My Shop',
        currencyCode: 'USD',
        taxDisplayMode: 'INVALID' as never,
      });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ taxDisplayMode: expect.any(String) });
    });

    it('should invalidate a negative lowStockDefaultThreshold', () => {
      const result = validateCreateBusiness({
        name: 'My Shop',
        currencyCode: 'USD',
        lowStockDefaultThreshold: -5,
      });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({
        lowStockDefaultThreshold: 'Low stock threshold must be at least 0',
      });
    });
  });
});
