import z from 'zod';
import type { CreateBaseUnitInput, CreateCustomUnitInput, UnitDependsOn } from '@mez/types';
import {
  nonFatalRequiredText,
  optionalNumberFromString,
  positiveNumberFromString,
} from '../schema/helpers.js';

/**
 * An MOU only exists once a content unit is selected. Dropping an unselected one keeps
 * the optional MOU out of both validation and the payload, instead of reporting a
 * required error for a field nobody filled in. The preprocess keeps the parsed type
 * pinned with a cast, as the sales schemas do.
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

export const baseUnitSchema = z
  .object(
    {
      unitId: nonFatalRequiredText('Unit is required'),
      price: positiveNumberFromString('Enter a valid price', 'Price must be greater than 0'),
    },
    { error: 'Base unit is required' },
  )
  .strict() satisfies z.ZodType<CreateBaseUnitInput>;

const mouSchema = z
  .object({
    unitId: nonFatalRequiredText('Unit is required'),
    conversionRate: positiveNumberFromString(
      'Conversion rate is required',
      'Conversion rate must be greater than 0',
    ),
    price: optionalNumberFromString('Price'),
  })
  .strict();

type MouRaw = z.output<typeof mouSchema>;

/**
 * The form's copy of a content unit: the body's fields plus the chosen unit's
 * dimension, which lets the form report the "different dimension" rule while it is
 * being filled in. The payload transform strips the dimension.
 */
const mouFormSchema = mouSchema.extend({
  dimensionId: nonFatalRequiredText('Dimension is required'),
});

type MouFormRaw = z.output<typeof mouFormSchema>;

export const optionalMouSchema = z.preprocess(
  dropUnselectedMou,
  mouSchema.optional(),
) as unknown as z.ZodOptional<z.ZodType<MouRaw>>;

export const optionalMouFormSchema = z.preprocess(
  dropUnselectedMou,
  mouFormSchema.optional(),
) as unknown as z.ZodOptional<z.ZodType<MouFormRaw>>;

/** Mirrors `UnitDependsOn` in @mez/types, so the two cannot drift. */
const UNIT_DEPENDS_ON = ['BASE', 'MOU'] as const satisfies readonly UnitDependsOn[];

/**
 * A custom unit depends on the base or content unit only: a portion of a portion would
 * need a chain of rates, so it never depends on another custom unit.
 */
const dependsOnSchema = nonFatalRequiredText('Depends on is required').pipe(
  z.enum(UNIT_DEPENDS_ON, { error: 'Depends on must be the base or content unit' }),
);

/**
 * One custom unit as it arrives. The rate and price are numbers in a request body and
 * text in the form, which the number helpers coerce. Unlike the content unit there is
 * no separate form copy, because nothing else differs.
 */
export const customUnitSchema = z
  .object(
    {
      name: nonFatalRequiredText(
        'Unit name is required',
        50,
        'Unit name must be at most 50 characters',
      ),
      dependsOn: dependsOnSchema,
      conversionRate: positiveNumberFromString(
        'Conversion rate is required',
        'Conversion rate must be greater than 0',
      ),
      // Optional here; `checkCustomUnitUse` below decides whether it must be present.
      price: optionalNumberFromString('Price').refine((value) => value === undefined || value > 0, {
        error: 'Price must be greater than 0',
      }),
      // Usable for both purchasing and selling unless the owner narrows it.
      purchaseCapable: z.boolean().default(true),
      sellCapable: z.boolean().default(true),
    },
    { error: 'A unit is required' },
  )
  .strict();

type ParsedCustomUnit = z.output<typeof customUnitSchema>;

type CustomUnitUse = Pick<ParsedCustomUnit, 'purchaseCapable' | 'sellCapable' | 'price'>;

/**
 * Whether a unit needs a price depends on what it can be used for, which no single
 * field's schema can see, so both rules live here and read their siblings. They
 * report alongside the field errors rather than aborting the unit.
 */
export const checkCustomUnitUse = (unit: CustomUnitUse, ctx: z.RefinementCtx) => {
  if (unit.sellCapable && unit.price === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['price'],
      message: 'A price is required for a unit you can sell',
    });
  }

  if (!unit.sellCapable && !unit.purchaseCapable) {
    ctx.addIssue({
      code: 'custom',
      path: ['sellCapable'],
      message: 'A unit must be usable for purchasing or selling',
    });
  }
};

/**
 * Turns one validated unit into the input the rest of the system reads, where the price
 * is no longer optional: carrying one means sell-capable, so the two cannot disagree.
 */
export const toCustomUnitPayload = (unit: ParsedCustomUnit): CreateCustomUnitInput => {
  const common = {
    name: unit.name,
    dependsOn: unit.dependsOn,
    conversionRate: unit.conversionRate,
    purchaseCapable: unit.purchaseCapable,
  };

  if (!unit.sellCapable) return { ...common, sellCapable: false };

  // Present by now: `checkCustomUnitUse` has rejected a sell-capable unit without one.
  return { ...common, sellCapable: true, price: unit.price as number };
};

export const customUnitsSchema = z
  .array(customUnitSchema.superRefine(checkCustomUnitUse))
  .transform((units) => units.map(toCustomUnitPayload));

/**
 * A content unit added to a product that already exists.
 */
export const contentUnitSchema = z
  .object({
    unitRole: z.literal('MOU'),
    unitId: nonFatalRequiredText('Unit is required'),
    conversionRate: positiveNumberFromString(
      'Conversion rate is required',
      'Conversion rate must be greater than 0',
    ),
    price: optionalNumberFromString('Price').refine((value) => value === undefined || value > 0, {
      error: 'Price must be greater than 0',
    }),
  })
  .strict();

/** The owner's own unit, tagged so the two kinds of unit-add can be told apart. */
export const customProductUnitSchema = customUnitSchema.extend({
  unitRole: z.literal('CUSTOM'),
});
