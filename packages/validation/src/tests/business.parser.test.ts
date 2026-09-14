import { describe, it, expect } from 'vitest';
import { validateCreateBusiness } from '../parser.js';

describe('parser', () => {
  describe('validateCreateBusiness', () => {
    it('should validate valid business creation values', () => {
      const result = validateCreateBusiness({ name: 'My Shop', currencyCode: 'USD' });

      expect(result.data).toEqual({ name: 'My Shop', currencyCode: 'USD' });
      expect(result.errors).toBeNull();
    });

    it('should transform raw optional strings into typed optional values', () => {
      const result = validateCreateBusiness({
        name: 'My Shop',
        currencyCode: 'USD',
        defaultTaxRate: '15' as unknown as number,
        taxDisplayMode: 'INCLUSIVE',
        lowStockDefaultThreshold: '10' as unknown as number,
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

    it('should treat empty optional fields as unset', () => {
      const result = validateCreateBusiness({
        name: 'My Shop',
        currencyCode: 'USD',
        defaultTaxRate: '' as unknown as number,
        taxDisplayMode: '' as never,
        lowStockDefaultThreshold: '' as unknown as number,
      });

      expect(result.data).toEqual({ name: 'My Shop', currencyCode: 'USD' });
      expect(result.errors).toBeNull();
    });

    it('should treat whitespace-only optional numbers as unset', () => {
      const result = validateCreateBusiness({
        name: 'My Shop',
        currencyCode: 'USD',
        defaultTaxRate: '  ' as unknown as number,
      });

      expect(result.data).toEqual({ name: 'My Shop', currencyCode: 'USD' });
      expect(result.errors).toBeNull();
    });

    it('should preserve a zero defaultTaxRate', () => {
      const result = validateCreateBusiness({
        name: 'My Shop',
        currencyCode: 'USD',
        defaultTaxRate: '0' as unknown as number,
      });

      expect(result.data).toEqual({ name: 'My Shop', currencyCode: 'USD', defaultTaxRate: 0 });
      expect(result.errors).toBeNull();
    });

    it('should trim whitespace around name', () => {
      const result = validateCreateBusiness({ name: '  My Shop  ', currencyCode: 'USD' });

      expect(result.data).toEqual({ name: 'My Shop', currencyCode: 'USD' });
    });

    it('should reject undefined name', () => {
      const result = validateCreateBusiness({ currencyCode: 'USD' } as never);

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ name: 'Business name is required' });
    });

    it('should reject undefined currencyCode', () => {
      const result = validateCreateBusiness({ name: 'My Shop' } as never);

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ currencyCode: 'Currency is required' });
    });

    it('should invalidate an empty name', () => {
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

    it('should invalidate an empty currencyCode', () => {
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

    it('should invalidate a non-numeric defaultTaxRate', () => {
      const result = validateCreateBusiness({
        name: 'My Shop',
        currencyCode: 'USD',
        defaultTaxRate: 'abc' as unknown as number,
      });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ defaultTaxRate: expect.any(String) });
    });

    it('should invalidate a defaultTaxRate above 100', () => {
      const result = validateCreateBusiness({
        name: 'My Shop',
        currencyCode: 'USD',
        defaultTaxRate: '101' as unknown as number,
      });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ defaultTaxRate: 'Tax rate must be at most 100' });
    });

    it('should invalidate a negative defaultTaxRate', () => {
      const result = validateCreateBusiness({
        name: 'My Shop',
        currencyCode: 'USD',
        defaultTaxRate: '-1' as unknown as number,
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
