import z from 'zod';
import type { CreateBusinessInput, TaxDisplayMode } from '@mez/types';

/**
 * Values a user submits in the create-business form.
 * Shares the same shape as the API's create-business input.
 */
export type CreateBusinessFormValues = CreateBusinessInput;

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Business name is required')
  .max(20, 'Business name must be at most 20 characters');

const currencyCodeSchema = z
  .string()
  .trim()
  .min(1, 'Currency is required')
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{3}$/, 'Enter a valid 3-letter ISO currency code'));

const defaultTaxRateSchema = z
  .number()
  .min(0, 'Tax rate must be at least 0')
  .max(100, 'Tax rate must be at most 100')
  .optional();

const taxDisplayModeValues = {
  EXCLUSIVE: 'EXCLUSIVE',
  INCLUSIVE: 'INCLUSIVE',
} satisfies Record<TaxDisplayMode, TaxDisplayMode>;

const taxDisplayModeSchema = z.enum(Object.values(taxDisplayModeValues)).optional();

const lowStockDefaultThresholdSchema = z
  .number()
  .min(0, 'Low stock threshold must be at least 0')
  .optional();

export const createBusinessSchema = z.object({
  name: nameSchema,
  currencyCode: currencyCodeSchema,
  defaultTaxRate: defaultTaxRateSchema,
  taxDisplayMode: taxDisplayModeSchema,
  lowStockDefaultThreshold: lowStockDefaultThresholdSchema,
});
