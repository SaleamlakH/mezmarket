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
 * Zod 4 reports a type mismatch as a fatal `invalid_type` issue, and a single
 * fatal issue aborts the whole product object which causes cross-field MOU rules
 * chained after that object silently skipped until the rest of the form happened
 * to be valid: an empty sell price.
 *
 * The helpers below normalise their input first so a field can only fail with a
 * non-fatal issue (`too_small`, `too_big` or `custom`). That keeps the MOU rules
 * reporting alongside the field errors instead of being swallowed. A genuine
 * type violation such as `name: 123` still aborts, because coercing it would
 * mean accepting malformed input.
 */
const nullishToEmptyString = (val: unknown) => (val === undefined || val === null ? '' : val);

const nullishToUndefined = (val: unknown) => (val === undefined || val === null ? undefined : val);

const toTrimmedText = (val: unknown) =>
  val === undefined || val === null ? '' : String(val).trim();

const blankToUndefined = (val: unknown) => {
  const text = toTrimmedText(val);
  return text === '' ? undefined : text;
};

/** Keeps an absent optional field absent instead of turning it into `""`. */
const optionalText = <T extends z.ZodType<string | undefined>>(schema: T) =>
  z.preprocess(nullishToUndefined, schema);

/** Parses a required, strictly positive number from text so it never yields `NaN`. */
const requiredNumber = (invalidMessage: string, positiveMessage: string) =>
  z
    .preprocess(toTrimmedText, z.string({ error: invalidMessage }))
    .refine((value) => value !== '' && Number.isFinite(Number(value)), {
      error: invalidMessage,
    })
    // Guarded so a value that is not a number yet reports only one issue.
    .refine((value) => value === '' || !Number.isFinite(Number(value)) || Number(value) > 0, {
      error: positiveMessage,
    })
    .transform(Number);

/** Parses an optional, non-negative number, leaving a blank field undefined. */
const optionalNumber = (invalidMessage: string, minimumMessage: string) =>
  z.preprocess(
    blankToUndefined,
    z
      .string({ error: invalidMessage })
      .trim()
      .refine((value) => Number.isFinite(Number(value)), { error: invalidMessage })
      .refine((value) => !Number.isFinite(Number(value)) || Number(value) >= 0, {
        error: minimumMessage,
      })
      .transform(Number)
      .optional(),
  );

const unitIdSchema = z.preprocess(
  nullishToEmptyString,
  z.string({ error: 'Unit is required' }).trim().min(1, 'Unit is required'),
);

/**
 * An MOU only exists once a content unit is selected (set unitId). A bland object
 * may reach the schema, which causes strict required validation failure.
 * Dropping it here keeps the optional MOU out of both the validation and the
 * payload, instead of reporting a required error for a field nobody filled in.
 */
const dropUnselectedMou = (val: unknown) => {
  if (
    val &&
    typeof val === 'object' &&
    !String((val as { unitId?: unknown }).unitId ?? '').trim()
  ) {
    return undefined;
  }
  return val;
};
const dimensionIdSchema = z.preprocess(
  nullishToEmptyString,
  z.string({ error: 'Dimension is required' }).trim().min(1, 'Dimension is required'),
);

const baseUnitSchema = z
  .object(
    {
      unitId: unitIdSchema,
      dimensionId: dimensionIdSchema,
      price: requiredNumber('Enter a valid price', 'Price must be greater than 0'),
    },
    { error: 'Base unit is required' },
  )
  .strict();

const mouSchema = z
  .object({
    unitId: unitIdSchema,
    dimensionId: dimensionIdSchema,
    conversionRate: requiredNumber(
      'Conversion rate is required',
      'Conversion rate must be greater than 0',
    ),
    price: optionalNumber('Enter a valid price', 'Price must be at least 0'),
  })
  .strict();

export const createProductSchema = z
  .object({
    name: z.preprocess(
      nullishToEmptyString,
      z
        .string({ error: 'Product name is required' })
        .trim()
        .min(1, 'Product name is required')
        .max(100, 'Product name must be at most 100 characters'),
    ),
    brand: optionalText(
      z.string().trim().max(50, 'Brand must be at most 50 characters').optional(),
    ),
    description: optionalText(
      z.string().trim().max(500, 'Description must be at most 500 characters').optional(),
    ),
    lowStockThreshold: optionalNumber(
      'Enter a valid threshold',
      'Low stock threshold must be at least 0',
    ),
    trackAsPartial: z.boolean().optional(),
    categoryId: optionalText(z.string().trim().min(1, 'Category is required').optional()),
    baseUnit: baseUnitSchema,
    mou: z.preprocess(dropUnselectedMou, mouSchema.optional()),
    uploadId: optionalText(z.string().trim().min(1, 'Upload is required').optional()),
  })
  .strict()
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
