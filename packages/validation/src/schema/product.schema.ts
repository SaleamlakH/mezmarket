import z from 'zod';
import type {
  CreateBaseUnitInput,
  CreateCustomUnitInput,
  CreateMouInput,
  CreateProductInput,
  UnitDependsOn,
} from '@mez/types';

export type CreateBaseUnitFormValues = Omit<CreateBaseUnitInput, 'price'> & {
  dimensionId: string;
  price: string;
};

export type CreateMouFormValues = Omit<CreateMouInput, 'conversionRate' | 'price'> & {
  dimensionId: string;
  conversionRate: string;
  price?: string;
};

/** The rate and the price are held as text by the form and coerced on the way out. */
export type CreateCustomUnitFormValues = {
  name: CreateCustomUnitInput['name'];
  dependsOn: CreateCustomUnitInput['dependsOn'];
  conversionRate: string;
  price: string;
  purchaseCapable: boolean;
  sellCapable: boolean;
};

export type CreateProductFormValues = Partial<
  Pick<CreateProductInput, 'brand' | 'description' | 'trackAsPartial' | 'categoryId'> & {
    lowStockThreshold: string;
  }
> &
  Pick<CreateProductInput, 'name'> & {
    baseUnit: CreateBaseUnitFormValues;
    mou?: CreateMouFormValues;
    customUnits: CreateCustomUnitFormValues[];
    uploadId?: CreateProductInput['uploadId'];
  };

/**
 * On Zod 4: a type mismatch is a fatal `invalid_type` issue, and one fatal issue aborts
 * the whole product object, which makes cross-field MOU rules chained after that object
 * silently skipped until the rest of the form happened to be valid — an empty sell
 * price. The text helpers below normalise their input first so a field can only fail
 * with a non-fatal issue (`too_small`, `too_big` or `custom`). That keeps the MOU rules
 * reporting alongside the field errors instead of being swallowed. A genuine type
 * violation such as `name: 123` still aborts, because coercing it would mean accepting
 * malformed input.
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

/**
 * Parses an optional, strictly positive number, leaving a blank field undefined.
 * This is the shape a price takes when whether it is required at all depends on
 * something else: the field itself only refuses a value that is present and not a
 * positive number, and what decides whether it must be present lives with the
 * rule that needs it.
 */
const optionalPositiveNumber = (invalidMessage: string, positiveMessage: string) =>
  z.preprocess(
    blankToUndefined,
    z
      .string({ error: invalidMessage })
      .trim()
      .refine((value) => Number.isFinite(Number(value)), { error: invalidMessage })
      .refine((value) => !Number.isFinite(Number(value)) || Number(value) > 0, {
        error: positiveMessage,
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
      price: requiredNumber('Enter a valid price', 'Price must be greater than 0'),
    },
    { error: 'Base unit is required' },
  )
  .strict();

const mouSchema = z
  .object({
    unitId: unitIdSchema,
    conversionRate: requiredNumber(
      'Conversion rate is required',
      'Conversion rate must be greater than 0',
    ),
    price: optionalNumber('Enter a valid price', 'Price must be at least 0'),
  })
  .strict();

/**
 * The form's copy of a content unit: the same fields as the body carries, plus the
 * dimension of the unit it chose. The dimension is what lets the form report the
 * "different dimension" rule while the user is still filling it in, and
 * `toPayload` strips it before the body is built.
 */
const mouFormSchema = mouSchema.extend({ dimensionId: dimensionIdSchema });

/** Mirrors `UnitDependsOn` in @mez/types, so the two cannot drift. */
const UNIT_DEPENDS_ON = ['BASE', 'MOU'] as const satisfies readonly UnitDependsOn[];

/**
 * The base and content units are the only two a unit can be based on. A custom unit
 * never depends on another custom unit: a portion of a portion would need a chain of
 * rates to be worth anything, and one factor relative to a real unit is the whole
 * point of the field.
 */
const dependsOnSchema = z.preprocess(
  nullishToEmptyString,
  z
    .string({ error: 'Depends on is required' })
    .trim()
    .min(1, 'Depends on is required')
    .pipe(z.enum(UNIT_DEPENDS_ON)),
);

/**
 * One custom unit as it arrives. This is the single schema behind both shapes it
 * turns up in: a request body carries the rate and the price as numbers, and the
 * form holds them as text, which the two number helpers above coerce on the way
 * out. Nothing else differs, so there is no separate form copy — unlike the
 * content unit, whose form carries a dimension the body has no business sending.
 */
const customUnitSchema = z
  .object(
    {
      name: z.preprocess(
        nullishToEmptyString,
        z
          .string({ error: 'Unit name is required' })
          .trim()
          .min(1, 'Unit name is required')
          .max(50, 'Unit name must be at most 50 characters'),
      ),
      dependsOn: dependsOnSchema,
      conversionRate: requiredNumber(
        'Conversion rate is required',
        'Conversion rate must be greater than 0',
      ),
      // Optional as a field, because whether it has to be there is not this field's
      // call to make — see `checkCustomUnitUse` below.
      price: optionalPositiveNumber('Enter a valid price', 'Price must be greater than 0'),
      // Usable for both purchasing and selling unless the owner narrows it.
      purchaseCapable: z.boolean().default(true),
      sellCapable: z.boolean().default(true),
    },
    { error: 'A unit is required' },
  )
  .strict();

type ParsedCustomUnit = z.output<typeof customUnitSchema>;

/**
 * What a unit may be used for decides whether it needs a price, which no single
 * field's schema can see — so both rules live here and read their siblings.
 *
 * A sell-capable unit without a price is the acceptance case: it would be a unit
 * the owner can offer and then not charge for. A unit usable for neither is the
 * mirror of that, a row nothing can be transacted with at all.
 *
 * These report alongside the field errors rather than replacing them, because every
 * field above goes through a normaliser that only ever produces non-fatal issues —
 * see the note at the top of this file, where a fatal one would abort the unit and
 * take these two with it.
 */
const checkCustomUnitUse = (unit: ParsedCustomUnit, ctx: z.RefinementCtx) => {
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
 * Turns one validated unit into the input the rest of the system reads, which is
 * where the price stops being optional: a unit that carries one is sell-capable and
 * a unit that does not is not, so the two can never disagree.
 */
const toCustomUnitPayload = (unit: ParsedCustomUnit): CreateCustomUnitInput => {
  const common = {
    name: unit.name,
    dependsOn: unit.dependsOn,
    conversionRate: unit.conversionRate,
    purchaseCapable: unit.purchaseCapable,
  };

  if (!unit.sellCapable) return { ...common, sellCapable: false };

  // Present by the time this runs: `checkCustomUnitUse` has already rejected a
  // sell-capable unit that arrived without one, and a transform only ever sees
  // input that passed.
  return { ...common, sellCapable: true, price: unit.price as number };
};

const customUnitsSchema = z
  .array(customUnitSchema.superRefine(checkCustomUnitUse))
  .transform((units) => units.map(toCustomUnitPayload));

/**
 * The rules a custom unit can only be judged against once it is read beside the rest
 * of the product, because both are about the product's other units rather than about
 * this field. Chained onto the whole product object, since that is where the siblings
 * live.
 *
 * A unit based on the content unit needs that content unit to exist — a `shot` measured
 * in millilitres means nothing while the product has no row saying how many millilitres
 * it holds. The owner's way out is either to set the content unit or to base the unit on
 * something that exists, so the error names the choice rather than only the fact.
 *
 * Names are compared the way a person reads them, so `Shot` and `shot` are one name and
 * cannot both exist on a product.
 *
 * Deliberately not decided here: whether a name is already taken by the base or content
 * unit, because those names are the standard units' *symbols*, which this request never
 * carries. The repository knows them — it is the thing that resolved the units — and it
 * rejects the clash itself.
 */
const checkCustomUnitsAgainstProduct = (product: ProductPayload, ctx: z.RefinementCtx) => {
  const taken = new Set<string>();

  (product.customUnits ?? []).forEach((unit, index) => {
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

const productBaseSchema = z
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
    // Absent is the normal case — most products are only ever traded in their base
    // and content units — so it defaults to an empty set rather than being required.
    customUnits: customUnitsSchema.default([]),
    uploadId: optionalText(z.string().trim().min(1, 'Upload is required').optional()),
  })
  .strict();

type ProductSchemaOutput = z.output<typeof productBaseSchema>;

/**
 * What the rest of the system reads. It differs from the parsed shape in two ways,
 * both about saying as little as possible: the dimension is resolved elsewhere, and
 * a field the owner never filled in is not carried at all.
 */
type ProductPayload = Omit<ProductSchemaOutput, 'customUnits'> & {
  customUnits?: CreateCustomUnitInput[] | undefined;
};

type ProductPayloadSource = Omit<ProductSchemaOutput, 'baseUnit' | 'mou'> & {
  baseUnit: ProductPayload['baseUnit'];
  mou?: ProductPayload['mou'] | undefined;
};

const toPayload = (data: ProductPayloadSource): ProductPayload => ({
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
  // Dropped when empty, for the same reason as the content unit above: most products
  // have none, and a payload should not carry a key that says nothing.
  customUnits: data.customUnits.length > 0 ? data.customUnits : undefined,
});

export const createProductSchema = productBaseSchema
  .refine((data) => !data.mou || data.mou.unitId !== data.baseUnit.unitId, {
    message: 'MOU must be different from the base unit',
    path: ['mou', 'unitId'],
  })
  .superRefine(checkCustomUnitsAgainstProduct)
  .transform(toPayload);

export const createProductFormSchema = productBaseSchema
  .extend({
    baseUnit: baseUnitSchema.extend({ dimensionId: dimensionIdSchema }),
    mou: z.preprocess(dropUnselectedMou, mouFormSchema.optional()),
  })
  .refine((data) => !data.mou || data.mou.dimensionId !== data.baseUnit.dimensionId, {
    message: 'MOU must be in a different dimension from the base unit',
    path: ['mou', 'dimensionId'],
  })
  .refine((data) => !data.mou || data.mou.unitId !== data.baseUnit.unitId, {
    message: 'MOU must be different from the base unit',
    path: ['mou', 'unitId'],
  })
  .superRefine(checkCustomUnitsAgainstProduct)
  .transform(toPayload);
