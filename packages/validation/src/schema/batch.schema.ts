import type { ZodType } from 'zod';
import z from 'zod';
import type {
  BatchFormValues,
  BatchLineFormValues,
  CreateBatchInput,
  CreateBatchLineInput,
  UpdateBatchFormValues,
  UpdateBatchInput,
  UpdateBatchLineFormValues,
  UpdateBatchLineInput,
} from '@mez/types';

/** `Decimal(12, 4)` — the precision a quantity is stored at. */
const QUANTITY_DECIMALS = 4;
/** `Decimal(10, 2)` — the precision a cost is stored at. */
const COST_DECIMALS = 2;

/** A field left blank is recorded as "no value" rather than an empty string. */
const blankIsUnset = (value: string) => (value === '' ? undefined : value);

/** Required text input: a missing field and a blank one report alike. */
const requiredText = (message: string) => z.string({ error: message }).trim().min(1, message);

/** Optional text input: blank becomes `undefined`. */
const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).transform(blankIsUnset).optional();

/** A UTC ISO 8601 instant, the shape a date picker hands over, as a `Date`. */
const instant = (error: string) => z.iso.datetime({ error }).transform((value) => new Date(value));

/** Required date input: text in, `Date` out. */
const dateFromString = (label: string) =>
  requiredText(`${label} is required`).pipe(instant('Enter a valid date'));

/** Optional date input: blank becomes `undefined`. */
const optionalDateFromString = z
  .string()
  .trim()
  .transform(blankIsUnset)
  .optional()
  .pipe(instant('Enter a valid date').optional());

/** Rounds a number to the decimal places a column keeps. */
const toStoredPrecision = (decimals: number) => (value: number) => Number(value.toFixed(decimals));

/**
 * Required numeric input: text or a number in, number out at the column's
 * precision. The form sends text; the wire also carries numbers a client has
 * already parsed, and both transform alike.
 */
const numberFromString = (label: string, decimals: number) =>
  z
    .custom<string>(
      (value) => typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''),
      { error: `${label} is required` },
    )
    .transform(Number)
    .pipe(
      z
        .number({ error: 'Enter a valid number' })
        .min(0, `${label} must be at least 0`)
        .transform(toStoredPrecision(decimals)),
    );

const batchLineFields = {
  productId: requiredText('Select a product'),
  productUnitId: requiredText('Select the unit it was bought in'),
  purchaseQuantity: numberFromString('Quantity', QUANTITY_DECIMALS).pipe(
    z.number().positive('Quantity must be greater than 0'),
  ),
  purchaseUnitCost: numberFromString('Unit cost', COST_DECIMALS),
  expiryDate: optionalDateFromString,
};

const batchHeaderShape = {
  batchDate: dateFromString('Batch date'),
  supplierName: optionalText(80, 'Supplier name must be 80 characters or less'),
  referenceNumber: optionalText(60, 'Reference number must be 60 characters or less'),
};

const batchLines = <T extends ZodType>(line: T) =>
  z.array(line).min(1, 'Add at least one product line');

/**
 * Drops keys left unset, so the parsed payload matches the API's
 * `?: string` shape instead of carrying an explicit `undefined`.
 */
function withoutUnset<T extends object>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as {
    [K in keyof T]: Exclude<T[K], undefined>;
  };
}

/**
 * One product line as entered in the add-batch form. The parsed output is
 * the API's `CreateBatchLineInput`.
 */
export const createBatchLineSchema = z
  .object(batchLineFields)
  .transform(withoutUnset) satisfies ZodType<CreateBatchLineInput, BatchLineFormValues>;

/**
 * One product line as entered in the edit form. A line carrying an `id`
 * updates that existing line, a line without one is inserted.
 */
export const updateBatchLineSchema = z
  .strictObject({
    ...batchLineFields,
    /** A line row that names no line to update is a newly added line. */
    id: z.string().trim().transform(blankIsUnset).optional(),
  })
  .transform(withoutUnset) satisfies ZodType<UpdateBatchLineInput, UpdateBatchLineFormValues>;

/**
 * Records a received purchase event and its lines. The parsed output is
 * the API's `CreateBatchInput`.
 */
export const createBatchSchema = z
  .object({
    ...batchHeaderShape,
    lines: batchLines(createBatchLineSchema),
  })
  .transform(withoutUnset) satisfies ZodType<CreateBatchInput, BatchFormValues>;

/**
 * Edits a recorded batch in place. A line carrying an `id` updates that
 * existing line, a line without one is inserted, and existing lines absent
 * from the payload are removed. The parsed output is the API's
 * `UpdateBatchInput`.
 */
export const updateBatchSchema = z
  .object({
    ...batchHeaderShape,
    lines: batchLines(updateBatchLineSchema),
  })
  .strict()
  .refine(
    (data) => {
      const ids = data.lines.flatMap((line) => (line.id === undefined ? [] : [line.id]));
      return new Set(ids).size === ids.length;
    },
    { error: 'A product line can only appear once', path: ['lines'] },
  )
  .transform(withoutUnset) satisfies ZodType<UpdateBatchInput, UpdateBatchFormValues>;
