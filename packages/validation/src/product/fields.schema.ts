import z from 'zod';
import type { ProductFieldsInput, UpdateProductInput } from '@mez/types';
import { blankIsUnset, clearableText, nonFatalRequiredText } from '../schema/helpers.js';

/**
 * The product's own columns. A create and a full-replace edit share one schema: every
 * field is written, and a cleared text or threshold is stored as `null` rather than
 * left behind. A missing `trackAsPartial` reads as off.
 */
export const productFieldsSchema = z
  .object({
    name: nonFatalRequiredText(
      'Product name is required',
      100,
      'Product name must be at most 100 characters',
    ),
    brand: clearableText(50, 'Brand must be at most 50 characters').default(null),
    description: clearableText(500, 'Description must be at most 500 characters').default(null),
    lowStockThreshold: z
      .union([z.string(), z.number(), z.null(), z.undefined()])
      .optional()
      .transform((value) => {
        if (value == null || (typeof value === 'string' && value.trim() === '')) return null;
        return Number(value);
      })
      .refine((value) => value === null || Number.isFinite(value), {
        error: 'Enter a valid threshold',
      })
      .refine((value) => value === null || value >= 0, {
        error: 'Low stock threshold must be at least 0',
      }),
    trackAsPartial: z.boolean().default(false),
    categoryId: z
      .string()
      .trim()
      .transform(blankIsUnset)
      .nullish()
      .transform((value) => value ?? null),
  })
  .strict() satisfies z.ZodType<ProductFieldsInput>;

/**
 * A full replace of the product's own columns. Units and the photo are edited through
 * their own schemas, because each form carries only its own fields.
 */
export const updateProductSchema = productFieldsSchema satisfies z.ZodType<UpdateProductInput>;

/** Flips a product between sold and no-longer-sold, apart from the detail update since it is its own action. */
export const updateProductActiveSchema = z
  .object({
    active: z.boolean({ error: 'Active is required' }),
  })
  .strict();
