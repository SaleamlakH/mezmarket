import z from 'zod';
import type { CreateBaseUnitInput, CreateMouInput, CreateProductInput } from '@mez/types';

export type CreateBaseUnitFormValues = Omit<CreateBaseUnitInput, 'price'> & {
  dimensionId: string;
  price: string;
};

export type CreateMouFormValues = Omit<CreateMouInput, 'conversionRate' | 'price'> & {
  dimensionId: string;
  conversionRate: string;
  price?: string;
};

export type CreateProductFormValues = Partial<
  Pick<CreateProductInput, 'brand' | 'description' | 'trackAsPartial' | 'categoryId'> & {
    lowStockThreshold: string;
  }
> &
  Pick<CreateProductInput, 'name'> & {
    baseUnit: CreateBaseUnitFormValues;
    mou?: CreateMouFormValues;
    uploadId?: CreateProductInput['uploadId'];
  };

/**
 * Helper to prevent empty form strings ("") from turning into 0 on optional fields.
 * It forces empty strings to `undefined` so that `.optional()` behaves correctly.
 */
const preprocessOptionalNumber = (val: unknown) => {
  if (typeof val === 'string' && val.trim() === '') return undefined;
  return val;
};

const unitIdSchema = z.string({ error: 'Unit is required' }).trim().min(1, 'Unit is required');

const dimensionIdSchema = z
  .string({ error: 'Dimension is required' })
  .trim()
  .min(1, 'Dimension is required');

const priceStringSchema = z.preprocess(
  preprocessOptionalNumber,
  z.coerce.number({ error: 'Enter a valid price' }).positive('Price must be greater than 0'),
);

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
    conversionRate: z.coerce
      .number({ error: 'Conversion rate is required' })
      .positive('Conversion rate must be greater than 0'),
    price: z.preprocess(
      preprocessOptionalNumber,
      z.coerce
        .number({ error: 'Enter a valid price' })
        .min(0, 'Price must be at least 0')
        .optional(),
    ),
  })
  .strict();

export const createProductSchema = z
  .object({
    name: z
      .string({ error: 'Product name is required' })
      .trim()
      .min(1, 'Product name is required')
      .max(100, 'Product name must be at most 100 characters'),
    brand: z.string().trim().max(50, 'Brand must be at most 50 characters').optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Description must be at most 500 characters')
      .optional(),
    lowStockThreshold: z.preprocess(
      preprocessOptionalNumber,
      z.coerce.number().min(0, 'Low stock threshold must be at least 0').optional(),
    ),
    trackAsPartial: z.boolean().optional(),
    categoryId: z.string().trim().min(1, 'Category is required').optional(),
    baseUnit: baseUnitSchema,
    mou: mouSchema.optional(),
    uploadId: z.string().trim().min(1, 'Upload is required').optional(),
  })
  .strict()
  .refine((data) => !data.trackAsPartial || data.mou !== undefined, {
    message: 'A product tracked as partial requires an MOU', // Fixed key from 'error' to 'message'
    path: ['mou'],
  })
  .refine((data) => !data.mou || data.mou.dimensionId !== data.baseUnit.dimensionId, {
    message: 'MOU must be in a different dimension from the base unit',
    path: ['mou', 'dimensionId'],
  })
  .refine((data) => !data.mou || data.mou.unitId !== data.baseUnit.unitId, {
    message: 'MOU must be different from the base unit',
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
