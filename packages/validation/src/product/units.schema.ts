import z from 'zod';
import type {
  CreateProductUnitInput,
  UpdateCustomUnitInput,
  UpdateProductUnitInput,
  UpdateProductUnitsInput,
} from '@mez/types';
import {
  clearableNumber,
  nonFatalRequiredText,
  optionalNumberFromString,
  positiveNumberFromString,
} from '../schema/helpers.js';
import {
  checkCustomUnitUse,
  contentUnitSchema,
  customProductUnitSchema,
  toCustomUnitPayload,
} from './shared.schema.js';

/**
 * A request that names no role is the older custom-unit shape, so it is read as one
 * rather than refused; a body that already says which kind it is is left alone.
 */
const withDefaultUnitRole = (val: unknown) => {
  if (val && typeof val === 'object' && !Array.isArray(val) && !('unitRole' in val)) {
    return { ...(val as Record<string, unknown>), unitRole: 'CUSTOM' };
  }
  return val;
};

/**
 * One unit added to a product that already exists: the owner's own `CUSTOM` unit, or the
 * single `MOU` content unit. Which cross-field rules apply follows the role, so the two
 * are separate schemas and the discriminator picks one — the custom one keeps the rule
 * that a price is required exactly when the unit can be sold.
 */
export const createProductUnitSchema = z
  .preprocess(
    withDefaultUnitRole,
    z.discriminatedUnion('unitRole', [customProductUnitSchema, contentUnitSchema]),
  )
  .superRefine((unit, ctx) => {
    if (unit.unitRole === 'CUSTOM') checkCustomUnitUse(unit, ctx);
  })
  .transform((unit): CreateProductUnitInput => {
    if (unit.unitRole === 'MOU') {
      return {
        unitRole: 'MOU',
        unitId: unit.unitId,
        conversionRate: unit.conversionRate,
        ...(unit.price !== undefined && { price: unit.price }),
      };
    }
    return { unitRole: 'CUSTOM', ...toCustomUnitPayload(unit) };
  });

/**
 * One row in a bulk unit edit. The role decides what may move: base and content rows
 * only restate their price, while a custom row may also change its name and
 * capabilities.
 */
const updateBaseUnitSchema = z
  .object({
    unitRole: z.literal('BASE'),
    id: nonFatalRequiredText('Unit is required'),
    price: positiveNumberFromString('Enter a valid price', 'Price must be greater than 0'),
  })
  .strict();

const updateMouSchema = z
  .object({
    unitRole: z.literal('MOU'),
    id: nonFatalRequiredText('Unit is required'),
    price: clearableNumber('Price')
      .default(null)
      .refine((value) => value === null || value > 0, {
        error: 'Price must be greater than 0',
      }),
  })
  .strict();

const updateCustomUnitBaseSchema = z
  .object({
    unitRole: z.literal('CUSTOM'),
    id: nonFatalRequiredText('Unit is required'),
    name: nonFatalRequiredText(
      'Unit name is required',
      50,
      'Unit name must be at most 50 characters',
    ),
    price: optionalNumberFromString('Price').refine((value) => value === undefined || value > 0, {
      error: 'Price must be greater than 0',
    }),
    purchaseCapable: z.boolean({ error: 'Purchase capability is required' }),
    sellCapable: z.boolean({ error: 'Sell capability is required' }),
  })
  .strict();

type ParsedUpdateCustomUnit = z.output<typeof updateCustomUnitBaseSchema>;

/**
 * A custom unit's editable copy. The price is written with the rest of the row on a
 * PUT, so a sellable unit must carry one exactly as it does when created.
 */
const toUpdateCustomUnitPayload = (unit: ParsedUpdateCustomUnit): UpdateCustomUnitInput => {
  const common = {
    id: unit.id,
    name: unit.name,
    purchaseCapable: unit.purchaseCapable,
  };

  if (!unit.sellCapable) {
    return {
      ...common,
      sellCapable: false,
      ...(unit.price === undefined ? {} : { price: unit.price }),
    };
  }

  return {
    ...common,
    sellCapable: true,
    price: unit.price as number,
  };
};

const updateProductUnitSchema = z
  .discriminatedUnion('unitRole', [
    updateBaseUnitSchema,
    updateMouSchema,
    updateCustomUnitBaseSchema,
  ])
  .superRefine((unit, ctx) => {
    if (unit.unitRole === 'CUSTOM') checkCustomUnitUse(unit, ctx);
  })
  .transform((unit): UpdateProductUnitInput => {
    if (unit.unitRole !== 'CUSTOM') return unit;
    return { unitRole: 'CUSTOM', ...toUpdateCustomUnitPayload(unit) };
  });

/** One bulk edit of a product's units; each row names the role its rules follow. */
export const updateProductUnitsSchema = z
  .object({
    units: z.array(updateProductUnitSchema),
  })
  .strict() satisfies z.ZodType<UpdateProductUnitsInput>;
