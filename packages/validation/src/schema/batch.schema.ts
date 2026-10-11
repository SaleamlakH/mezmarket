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
import {
  blankIsUnset,
  notAfterNow,
  numberFromString,
  optionalInstant,
  optionalText,
  requiredInstant,
  requiredText,
  withoutUnset,
} from './helpers.js';

/** `Decimal(12, 4)` — the precision a quantity is stored at. */
const QUANTITY_DECIMALS = 4;
/** `Decimal(10, 2)` — the precision a cost is stored at. */
const COST_DECIMALS = 2;

const batchLineFields = {
  productId: requiredText('Select a product'),
  productUnitId: requiredText('Select the unit it was bought in'),
  purchaseQuantity: numberFromString('Quantity', QUANTITY_DECIMALS).pipe(
    z.number().positive('Quantity must be greater than 0'),
  ),
  purchaseUnitCost: numberFromString('Unit cost', COST_DECIMALS),
  expiryDate: optionalInstant,
};

const batchHeaderShape = {
  batchDate: notAfterNow(requiredInstant('Batch date'), 'Batch date cannot be in the future'),
  supplierName: optionalText(80, 'Supplier name must be 80 characters or less'),
  referenceNumber: optionalText(60, 'Reference number must be 60 characters or less'),
};

const batchLines = <T extends ZodType>(line: T) =>
  z.array(line).min(1, 'Add at least one product line');

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
