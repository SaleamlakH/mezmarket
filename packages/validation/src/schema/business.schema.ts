import z from 'zod';
import type { CreateBusinessInput, UpdateBusinessInput } from '@mez/types';

/**
 * Values a user submits in the create-business form.
 * Shares the same shape as the API's create-business input.
 */
export type CreateBusinessFormValues = CreateBusinessInput;

/**
 * Raw values a user submits in the business profile form.
 */
export type UpdateBusinessFormValues = UpdateBusinessInput;

const nameSchema = z
  .string({ error: 'Business name is required' })
  .trim()
  .min(1, 'Business name is required')
  .max(20, 'Business name must be at most 20 characters');

const currencyCodeSchema = z
  .string({ error: 'Currency is required' })
  .trim()
  .min(1, 'Currency is required')
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{3}$/, 'Enter a valid 3-letter ISO currency code'));

/**
 * Coerces an unset or numeric form input before number constraints run.
 * `''`, whitespace-only, and `undefined` mean "unset". Valid numeric strings
 * become numbers; anything else is passed through so `z.number()` can
 * report the error.
 */
function preprocessOptionalNumber(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return undefined;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return value;
}

const defaultTaxRateSchema = z.preprocess(
  preprocessOptionalNumber,
  z
    .number()
    .min(1, 'Tax rate must be at least 1')
    .max(50, 'Tax rate must be at most 50')
    .optional(),
);

const lowStockDefaultThresholdSchema = z.preprocess(
  preprocessOptionalNumber,
  z.number().min(0, 'Low stock threshold must be at least 0').optional(),
);

export const createBusinessSchema = z
  .object({
    name: nameSchema,
    currencyCode: currencyCodeSchema,
    defaultTaxRate: defaultTaxRateSchema,
    taxOnSales: z.boolean().optional(),
    lowStockDefaultThreshold: lowStockDefaultThresholdSchema,
  })
  .superRefine((data, ctx) => {
    if (data.taxOnSales === true && data.defaultTaxRate === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['defaultTaxRate'],
        message: 'Tax Rate is required if added to sales',
      });
    }
  });

export const updateBusinessSchema = z
  .object({
    name: nameSchema,
    currencyCode: currencyCodeSchema,
    defaultTaxRate: defaultTaxRateSchema,
    taxOnSales: z.boolean().optional(),
    allowNegativeStock: z.boolean().optional(),
    lowStockDefaultThreshold: lowStockDefaultThresholdSchema,
  })
  .superRefine((data, ctx) => {
    if (data.taxOnSales === true && data.defaultTaxRate === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['defaultTaxRate'],
        message: 'Tax on sales is on. Set a rate between 1 and 50.',
      });
    }
  });
