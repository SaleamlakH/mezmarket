import { describe, it, expect } from 'vitest';
import { validateCreateBusiness, validateUpdateBusiness } from '../parser.js';

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
        taxOnSales: true,
        lowStockDefaultThreshold: '10' as unknown as number,
      });

      expect(result.data).toEqual({
        name: 'My Shop',
        currencyCode: 'USD',
        defaultTaxRate: 15,
        taxOnSales: true,
        lowStockDefaultThreshold: 10,
      });
      expect(result.errors).toBeNull();
    });

    it('should treat empty optional fields as unset', () => {
      const result = validateCreateBusiness({
        name: 'My Shop',
        currencyCode: 'USD',
        defaultTaxRate: '' as unknown as number,
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

    it('should invalidate a defaultTaxRate below 1', () => {
      const result = validateCreateBusiness({
        name: 'My Shop',
        currencyCode: 'USD',
        defaultTaxRate: '0' as unknown as number,
      });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ defaultTaxRate: expect.any(String) });
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

    it('should invalidate a defaultTaxRate above 50', () => {
      const result = validateCreateBusiness({
        name: 'My Shop',
        currencyCode: 'USD',
        defaultTaxRate: '51' as unknown as number,
      });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ defaultTaxRate: expect.any(String) });
    });

    it('should invalidate a negative defaultTaxRate', () => {
      const result = validateCreateBusiness({
        name: 'My Shop',
        currencyCode: 'USD',
        defaultTaxRate: '-1' as unknown as number,
      });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ defaultTaxRate: expect.any(String) });
    });

    it('should accept taxOnSales as a boolean', () => {
      for (const taxOnSales of [true, false] as const) {
        const result = validateCreateBusiness({
          name: 'My Shop',
          currencyCode: 'USD',
          ...(taxOnSales ? { defaultTaxRate: 15 } : {}),
          taxOnSales,
        });

        expect(result.data).toEqual({
          name: 'My Shop',
          currencyCode: 'USD',
          taxOnSales,
          ...(taxOnSales ? { defaultTaxRate: 15 } : {}),
        });
        expect(result.errors).toBeNull();
      }
    });

    it('should require a tax rate when tax is added to sales', () => {
      const result = validateCreateBusiness({
        name: 'My Shop',
        currencyCode: 'USD',
        taxOnSales: true,
      });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({
        defaultTaxRate: expect.any(String),
      });
    });

    it('should invalidate a taxOnSales that is not a boolean', () => {
      const result = validateCreateBusiness({
        name: 'My Shop',
        currencyCode: 'USD',
        taxOnSales: 'yes' as never,
      });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ taxOnSales: expect.any(String) });
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

  describe('validateUpdateBusiness', () => {
    const base = { name: 'Selam Mart', currencyCode: 'ETB' };

    it('should validate a valid update with only required fields', () => {
      const result = validateUpdateBusiness(base);

      expect(result.data).toEqual(base);
      expect(result.errors).toBeNull();
    });

    it('should validate a full update with all fields', () => {
      const input = {
        ...base,
        defaultTaxRate: 15,
        taxOnSales: true,
        allowNegativeStock: false,
        lowStockDefaultThreshold: 10,
      };

      const result = validateUpdateBusiness(input);

      expect(result.data).toEqual(input);
      expect(result.errors).toBeNull();
    });

    it('should reject undefined name', () => {
      const result = validateUpdateBusiness({ currencyCode: 'ETB' } as never);

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ name: 'Business name is required' });
    });

    it('should reject undefined currencyCode', () => {
      const result = validateUpdateBusiness({ name: 'Selam Mart' } as never);

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ currencyCode: 'Currency is required' });
    });

    it('should invalidate an empty name', () => {
      const result = validateUpdateBusiness({ ...base, name: '' });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ name: 'Business name is required' });
    });

    it('should invalidate a name longer than 20 characters', () => {
      const result = validateUpdateBusiness({ ...base, name: 'A'.repeat(21) });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({
        name: 'Business name must be at most 20 characters',
      });
    });

    it('should trim whitespace around name', () => {
      const result = validateUpdateBusiness({ ...base, name: '  Selam Mart  ' });

      expect(result.data).toEqual({ ...base, name: 'Selam Mart' });
      expect(result.errors).toBeNull();
    });

    it('should invalidate an empty currencyCode', () => {
      const result = validateUpdateBusiness({ ...base, currencyCode: '' });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ currencyCode: 'Currency is required' });
    });

    it('should invalidate a currencyCode with the wrong length', () => {
      const result = validateUpdateBusiness({ ...base, currencyCode: 'USDX' });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({
        currencyCode: 'Enter a valid 3-letter ISO currency code',
      });
    });

    it('should uppercase a lowercase currencyCode', () => {
      const result = validateUpdateBusiness({ ...base, currencyCode: 'usd' });

      expect(result.data).toEqual({ ...base, currencyCode: 'USD' });
      expect(result.errors).toBeNull();
    });

    it('should convert numeric string fields to numbers', () => {
      const result = validateUpdateBusiness({
        ...base,
        defaultTaxRate: '12.5' as never,
        lowStockDefaultThreshold: '8' as never,
      });

      expect(result.data).toEqual({ ...base, defaultTaxRate: 12.5, lowStockDefaultThreshold: 8 });
      expect(result.errors).toBeNull();
    });

    it('should treat empty numeric fields as unset', () => {
      const result = validateUpdateBusiness({
        ...base,
        defaultTaxRate: '' as never,
        lowStockDefaultThreshold: '' as never,
      });

      expect(result.data).toEqual(base);
      expect(result.errors).toBeNull();
    });

    it('should invalidate a defaultTaxRate below 1', () => {
      const result = validateUpdateBusiness({ ...base, defaultTaxRate: 0 });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ defaultTaxRate: expect.any(String) });
    });

    it('should reject a null defaultTaxRate', () => {
      const result = validateUpdateBusiness({ ...base, defaultTaxRate: null as never });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ defaultTaxRate: expect.any(String) });
    });

    it('should invalidate a non-numeric defaultTaxRate', () => {
      const result = validateUpdateBusiness({ ...base, defaultTaxRate: 'abc' as never });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ defaultTaxRate: expect.any(String) });
    });

    it('should invalidate a defaultTaxRate above 50', () => {
      const result = validateUpdateBusiness({ ...base, defaultTaxRate: 51 });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ defaultTaxRate: expect.any(String) });
    });

    it('should invalidate a negative defaultTaxRate', () => {
      const result = validateUpdateBusiness({ ...base, defaultTaxRate: -1 });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ defaultTaxRate: expect.any(String) });
    });

    it('should accept taxOnSales as a boolean', () => {
      const off = validateUpdateBusiness({ ...base, taxOnSales: false });
      const on = validateUpdateBusiness({ ...base, defaultTaxRate: 15, taxOnSales: true });

      expect(off.data).toEqual({ ...base, taxOnSales: false });
      expect(off.errors).toBeNull();
      expect(on.data).toEqual({ ...base, defaultTaxRate: 15, taxOnSales: true });
      expect(on.errors).toBeNull();
    });

    it('should require a tax rate when tax is added to sales', () => {
      const result = validateUpdateBusiness({ ...base, taxOnSales: true });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({
        defaultTaxRate: expect.any(String),
      });
    });

    it('should invalidate a taxOnSales that is not a boolean', () => {
      const result = validateUpdateBusiness({ ...base, taxOnSales: 'yes' as never });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ taxOnSales: expect.any(String) });
    });

    it('should accept allowNegativeStock as a boolean', () => {
      const result = validateUpdateBusiness({ ...base, allowNegativeStock: false });

      expect(result.data).toEqual({ ...base, allowNegativeStock: false });
      expect(result.errors).toBeNull();
    });

    it('should invalidate an allowNegativeStock that is not a boolean', () => {
      const result = validateUpdateBusiness({ ...base, allowNegativeStock: 'yes' as never });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({ allowNegativeStock: expect.any(String) });
    });

    it('should invalidate a negative lowStockDefaultThreshold', () => {
      const result = validateUpdateBusiness({ ...base, lowStockDefaultThreshold: -5 });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual({
        lowStockDefaultThreshold: 'Low stock threshold must be at least 0',
      });
    });
  });
});
