import z from 'zod';
import type { CreateCustomUnitInput, CreateMouInput, CreateProductInput } from '@mez/types';
import { nonFatalRequiredText } from '../schema/helpers.js';
import { productFieldsSchema } from './fields.schema.js';
import { productImageSchema } from './image.schema.js';
import {
  baseUnitSchema,
  customUnitsSchema,
  optionalMouFormSchema,
  optionalMouSchema,
} from './shared.schema.js';

/**
 * What the rest of the system reads. It differs from the parsed shape in two ways:
 * the form's dimensions are resolved elsewhere, and a field the owner never filled in
 * is not carried at all.
 */
type ProductPayloadSource = Omit<CreateProductInput, 'mou' | 'customUnits' | 'uploadId'> & {
  uploadId?: string | undefined;
  mou?:
    | (Omit<CreateMouInput, 'price'> & {
        price?: number | undefined;
        dimensionId?: string | undefined;
      })
    | undefined;
  customUnits: CreateCustomUnitInput[];
};

type ProductWithUnitsRule = Pick<ProductPayloadSource, 'mou' | 'customUnits'>;

/**
 * Rules judged against the product's other units, so chained onto the whole product
 * object where those siblings live. A unit based on the content unit needs one to
 * exist; names are compared as a person reads them, so `Shot` and `shot` clash.
 * Whether a name clashes with the base or content unit is left to the repository,
 * which knows their symbols — this request never carries them.
 */
const checkCustomUnitsAgainstProduct = (product: ProductWithUnitsRule, ctx: z.RefinementCtx) => {
  const taken = new Set<string>();

  product.customUnits.forEach((unit, index) => {
    const name = unit.name.toLowerCase();

    if (taken.has(name)) {
      ctx.addIssue({
        code: 'custom',
        path: ['customUnits', index, 'name'],
        message: 'Two units on a product cannot share a name',
      });
    }
    taken.add(name);

    if (unit.dependsOn === 'MOU' && !product.mou) {
      ctx.addIssue({
        code: 'custom',
        path: ['customUnits', index, 'dependsOn'],
        message: 'Set a content unit first, or base this unit on the base unit instead',
      });
    }
  });
};

const toProductPayload = <T extends ProductPayloadSource>(data: T): CreateProductInput => {
  const { baseUnit, mou, customUnits, uploadId, ...fields } = data;

  return {
    ...fields,
    ...(uploadId !== undefined && { uploadId }),
    baseUnit: {
      unitId: baseUnit.unitId,
      price: baseUnit.price,
    },
    ...(mou !== undefined && {
      mou: {
        unitId: mou.unitId,
        conversionRate: mou.conversionRate,
        ...(mou.price !== undefined && { price: mou.price }),
      },
    }),
    // Dropped when empty, like the content unit: no key that says nothing.
    ...(customUnits.length > 0 && { customUnits }),
  };
};

const productBodySchema = productFieldsSchema
  .extend({
    baseUnit: baseUnitSchema,
    mou: optionalMouSchema,
    // Most products have none, so an absent set defaults to empty.
    customUnits: customUnitsSchema.default([]),
    uploadId: productImageSchema,
  })
  .strict();

export const createProductSchema = productBodySchema
  .refine((data) => !data.mou || data.mou.unitId !== data.baseUnit.unitId, {
    message: 'MOU must be different from the base unit',
    path: ['mou', 'unitId'],
  })
  .superRefine(checkCustomUnitsAgainstProduct)
  .transform(toProductPayload) satisfies z.ZodType<CreateProductInput>;

const productFormSchema = productFieldsSchema
  .extend({
    baseUnit: baseUnitSchema.extend({
      dimensionId: nonFatalRequiredText('Dimension is required'),
    }),
    mou: optionalMouFormSchema,
    customUnits: customUnitsSchema.default([]),
    uploadId: productImageSchema,
  })
  .strict();

export const createProductFormSchema = productFormSchema
  .refine((data) => !data.mou || data.mou.dimensionId !== data.baseUnit.dimensionId, {
    message: 'MOU must be in a different dimension from the base unit',
    path: ['mou', 'dimensionId'],
  })
  .refine((data) => !data.mou || data.mou.unitId !== data.baseUnit.unitId, {
    message: 'MOU must be different from the base unit',
    path: ['mou', 'unitId'],
  })
  .superRefine(checkCustomUnitsAgainstProduct)
  .transform(toProductPayload) satisfies z.ZodType<CreateProductInput>;
