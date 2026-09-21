import z from 'zod';
import type { CreateBaseUnitInput, CreateMouInput, CreateProductInput } from '@mez/types';

export interface CreateBaseUnitFormValues extends CreateBaseUnitInput {
  dimensionId: string;
}

export interface CreateMouFormValues extends CreateMouInput {
  dimensionId: string;
}

/**
 * Values a user submits when creating a product, derived from
 * `dimensionId` is required on each unit input purely so the pack relation
 * (base ↔ MOU) for fast validation;
 * it is stripped from the validated output and never reaches the API.
 */
export type CreateProductFormValues = Partial<
  Pick<
    CreateProductInput,
    'brand' | 'description' | 'lowStockThreshold' | 'trackAsPartial' | 'categoryId'
  >
> &
  Pick<CreateProductInput, 'name'> & {
    baseUnit: CreateBaseUnitFormValues;
    mou?: CreateMouFormValues;
    uploadId?: CreateProductInput['uploadId'];
  };

const unitIdSchema = z.string({ error: 'Unit is required' }).trim().min(1, 'Unit is required');

const dimensionIdSchema = z
  .string({ error: 'Dimension is required' })
  .trim()
  .min(1, 'Dimension is required');

/**
 * Price is submitted as a string (matching `CreateBaseUnitInput.price`) and
 * validated against the `Decimal(10, 2)` column it will be written to.
 */
const priceStringSchema = z
  .string({ error: 'Base unit price is required' })
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid price')
  .refine((value) => Number(value) > 0, 'Price must be greater than 0');

const baseUnitSchema = z
  .object(
    {
      unitId: unitIdSchema,
      dimensionId: dimensionIdSchema,
      price: priceStringSchema,
    },
    { error: 'Base unit is required' },
  )
  .strict();

const mouSchema = z
  .object({
    unitId: unitIdSchema,
    dimensionId: dimensionIdSchema,
    conversionRate: z
      .number({ error: 'Conversion rate is required' })
      .positive('Conversion rate must be greater than 0'),
    price: z.number().min(0, 'Price must be at least 0').optional(),
  })
  .strict();

export const createProductSchema = z
  .object({
    name: z
      .string({ error: 'Product name is required' })
      .trim()
      .min(1, 'Product name is required')
      .max(100, 'Product name must be at most 100 characters'),
    brand: z.string().trim().max(50, 'Brand must be at most 50 characters').nullable().optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Description must be at most 500 characters')
      .nullable()
      .optional(),
    lowStockThreshold: z
      .number()
      .min(0, 'Low stock threshold must be at least 0')
      .nullable()
      .optional(),
    trackAsPartial: z.boolean().optional(),
    categoryId: z.string().trim().min(1, 'Category is required').nullable().optional(),
    baseUnit: baseUnitSchema,
    mou: mouSchema.optional(),
    uploadId: z.string().trim().min(1, 'Upload is required').optional(),
  })
  .strict()
  .refine((data) => !data.trackAsPartial || data.mou !== undefined, {
    error: 'A product tracked as partial requires an MOU',
    path: ['mou'],
  })
  .refine((data) => !data.mou || data.mou.dimensionId !== data.baseUnit.dimensionId, {
    error: 'MOU must be in a different dimension from the base unit',
    path: ['mou', 'dimensionId'],
  })
  .refine((data) => !data.mou || data.mou.unitId !== data.baseUnit.unitId, {
    error: 'MOU must be different from the base unit',
    path: ['mou', 'unitId'],
  })
  .transform((data) => ({
    ...data,
    baseUnit: {
      unitId: data.baseUnit.unitId,
      price: data.baseUnit.price,
    },
    mou: data.mou
      ? {
          unitId: data.mou.unitId,
          conversionRate: data.mou.conversionRate,
          ...(data.mou.price !== undefined && { price: data.mou.price }),
        }
      : undefined,
  }));
