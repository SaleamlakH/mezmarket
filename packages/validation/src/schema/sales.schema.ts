import type { ZodType } from 'zod';
import z from 'zod';
import type {
  CreateSaleInput,
  CreateSaleLineInput,
  PaymentFormValues,
  PaymentInput,
  PaymentMethod,
  PaymentStatus,
  RecordPaymentInput,
  RefundSaleFormValues,
  RefundSaleInput,
  RefundSaleLineFormValues,
  RefundSaleLineInput,
  SaleFormValues,
  SaleLineFormValues,
  UpdateSaleFormValues,
  UpdateSaleInput,
  UpdateSaleLineFormValues,
  UpdateSaleLineInput,
  VoidSaleFormValues,
  VoidSaleInput,
} from '@mez/types';
import {
  blankIsUnset,
  notAfterNow,
  numberFromString,
  optionalEnum,
  optionalInstant,
  optionalNumberFromString,
  optionalText,
  requiredText,
  withoutUnset,
} from './helpers.js';

/** `Decimal(12, 4)` — the precision a quantity is stored at. */
const QUANTITY_DECIMALS = 4;
/** `Decimal(10, 2)` — the precision an amount is stored at. */
const MONEY_DECIMALS = 2;

/**
 * Mirrors `PaymentMethod` in @mez/types, so the two cannot drift. Exported for
 * the forms that offer the choices.
 */
export const PAYMENT_METHODS = [
  'CASH',
  'CARD',
  'BANK_TRANSFER',
  'MOBILE_MONEY',
  'OTHER',
] as const satisfies readonly PaymentMethod[];

/**
 * Mirrors `PaymentStatus` in @mez/types. Every value is accepted from a caller
 * — the API never derives a status it was not told — so the list is complete
 * rather than the subset a manual selector happens to offer.
 */
export const PAYMENT_STATUSES = [
  'PAID',
  'PENDING',
  'PARTIALLY_PAID',
] as const satisfies readonly PaymentStatus[];

const saleLineFields = {
  productId: requiredText('Select a product'),
  productUnitId: requiredText('Select the unit it is sold in'),
  quantity: numberFromString('Quantity', QUANTITY_DECIMALS).pipe(
    z.number().positive('Quantity must be greater than 0'),
  ),
  sellCapable: z.boolean().optional(),
};

/**
 * Refuses a line whose chosen unit the form flagged as not sellable. The error
 * lands on `productUnitId` so it points at the unit selector a user changes.
 */
const checkSellableUnit = (line: { sellCapable?: boolean | undefined }, ctx: z.RefinementCtx) => {
  if (line.sellCapable === false) {
    ctx.addIssue({
      code: 'custom',
      path: ['productUnitId'],
      message: 'This unit cannot be sold',
    });
  }
};

/** Drops the fast-forward field, which is the form's own and no business of the payload. */
const withoutFastForward = <T extends { sellCapable?: boolean | undefined }>(value: T) => {
  const payload = { ...value };
  delete payload.sellCapable;
  return payload as Omit<T, 'sellCapable'>;
};

const saleLines = <T extends ZodType>(line: T) =>
  z.array(line).min(1, 'Add at least one product line');

/**
 * One product line as entered in the new-sale form. The parsed output is the
 * API's `CreateSaleLineInput`.
 */
export const createSaleLineSchema = z
  .object(saleLineFields)
  .superRefine(checkSellableUnit)
  .transform(withoutFastForward) satisfies ZodType<CreateSaleLineInput, SaleLineFormValues>;

/**
 * One product line as entered in the edit-sale form. A line carrying an `id`
 * updates that existing line, a line without one is inserted.
 */
export const updateSaleLineSchema = z
  .strictObject({
    ...saleLineFields,
    /** A line row that names no line to update is a newly added line. */
    id: z.string().trim().transform(blankIsUnset).optional(),
  })
  .superRefine(checkSellableUnit)
  .transform((line) => withoutUnset(withoutFastForward(line))) satisfies ZodType<
  UpdateSaleLineInput,
  UpdateSaleLineFormValues
>;

const paymentFields = {
  status: z.enum(PAYMENT_STATUSES, { error: 'Select a payment status' }),
  amount: optionalNumberFromString('Amount', MONEY_DECIMALS).refine(
    (value) => value === undefined || value > 0,
    { error: 'Amount must be greater than 0' },
  ),
  method: optionalEnum(PAYMENT_METHODS, 'Select a valid payment method'),
  methodDetail: optionalText(200, 'Payment detail must be 200 characters or less'),
};

/**
 * Ties the amount to the status it is given with: a partial payment cannot be
 * recorded without an amount, and a pending sale records no payment at all.
 * A paid sale may omit the amount — the server settles the balance.
 */
const checkPaymentAmount = (
  payment: { status: PaymentStatus; amount?: number | undefined },
  ctx: z.RefinementCtx,
) => {
  if (payment.status === 'PARTIALLY_PAID' && payment.amount === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['amount'],
      message: 'Enter the amount received',
    });
  }

  if (payment.status === 'PENDING' && payment.amount !== undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['amount'],
      message: 'A pending sale records no payment',
    });
  }
};

/**
 * A payment as submitted. The form holds the amount as text and the wire
 * carries it as a number; both parse to the same `PaymentInput`.
 *
 * Zod's `.optional()` types an omitted field as `x | undefined`, which
 * `exactOptionalPropertyTypes` will not accept against the published
 * `PaymentInput`'s plain `?:`. The runtime shape is exactly the form's — a
 * blank select arrives as unset — so the input is asserted here rather than
 * widening the shared contract.
 */
const paymentSchema = z
  .strictObject(paymentFields)
  .superRefine(checkPaymentAmount)
  .transform(withoutUnset) as unknown as ZodType<PaymentInput, PaymentFormValues>;

/**
 * A payment recorded against an existing sale. The target sale is named by the
 * route, not the payload — see `RecordPaymentInput`.
 */
export const recordPaymentSchema = paymentSchema satisfies ZodType<
  RecordPaymentInput,
  PaymentFormValues
>;

/**
 * A blank payment block arrives when the new-sale form's payment section is
 * left untouched. Dropping it here keeps the optional payment out of both
 * validation and the payload, instead of reporting a required error for a
 * payment nobody entered.
 *
 * This is the one place a `z.preprocess` earns its keep: dropping a block can
 * only be decided before the block is parsed, and `preprocess` widens the input
 * to `unknown`. The cast below pins the form shape back on so the create
 * schema's `satisfies` guard stays meaningful.
 */
const dropUnselectedPayment = (value: unknown) => {
  if (
    value &&
    typeof value === 'object' &&
    !String((value as { status?: unknown }).status ?? '').trim()
  ) {
    return undefined;
  }
  return value;
};

const initialPaymentSchema = z.preprocess(
  dropUnselectedPayment,
  paymentSchema.optional(),
) as unknown as z.ZodOptional<ZodType<PaymentInput, PaymentFormValues>>;

/**
 * Records a sale and confirms it in one action. The parsed output is the API's
 * `CreateSaleInput`.
 */
export const createSaleSchema = z
  .object({
    saleDatetime: notAfterNow(optionalInstant, 'Sale date cannot be in the future'),
    lines: saleLines(createSaleLineSchema),
    initialPayment: initialPaymentSchema,
    /** A customer row selected from the list; a blank selection is no customer. */
    customerId: z.string().trim().transform(blankIsUnset).optional(),
    // The discount is taken as entered; the money it feeds is rounded once, in
    // the sale's totals, so it is not rounded again here. The pipe is what lets
    // a blank field's `undefined` through, not just a number.
    discount: optionalNumberFromString('Discount').pipe(
      z.number().min(0, 'Discount must be at least 0').optional(),
    ),
  })
  .transform(withoutUnset) satisfies ZodType<CreateSaleInput, SaleFormValues>;

/**
 * Edits a recorded sale in place. A line carrying an `id` updates that existing
 * line, a line without one is inserted, and existing lines absent from the
 * payload are removed. The parsed output is the API's `UpdateSaleInput`.
 */
export const updateSaleSchema = z
  .object({
    saleDatetime: notAfterNow(optionalInstant, 'Sale date cannot be in the future'),
    lines: saleLines(updateSaleLineSchema),
    /** An omitted customer leaves the attached one untouched; a blank is no change. */
    customerId: z.string().trim().transform(blankIsUnset).optional(),
    discount: optionalNumberFromString('Discount').pipe(
      z.number().min(0, 'Discount must be at least 0').optional(),
    ),
  })
  .strict()
  .refine(
    (data) => {
      const ids = data.lines.flatMap((line) => (line.id === undefined ? [] : [line.id]));
      return new Set(ids).size === ids.length;
    },
    { error: 'A product line can only appear once', path: ['lines'] },
  )
  .transform(withoutUnset) satisfies ZodType<UpdateSaleInput, UpdateSaleFormValues>;

const reasonSchema = requiredText('A reason is required').max(
  500,
  'Reason must be 500 characters or less',
);

/**
 * Reverses a sale that shouldn't have happened. The parsed output is the API's
 * `VoidSaleInput`.
 */
export const voidSaleSchema = z.object({
  reason: reasonSchema,
}) satisfies ZodType<VoidSaleInput, VoidSaleFormValues>;

/**
 * One line's restock choice in a refund. The parsed output is the API's
 * `RefundSaleLineInput`.
 */
export const refundSaleLineSchema = z.strictObject({
  lineId: requiredText('Select a line'),
  restock: z.boolean(),
}) satisfies ZodType<RefundSaleLineInput, RefundSaleLineFormValues>;

/**
 * Refunds a sale that did happen. A line left out follows its product's default
 * restock behavior. The parsed output is the API's `RefundSaleInput`.
 *
 * Same `optional`/`exactOptionalPropertyTypes` mismatch as the payment above:
 * `lines` is asserted so an omitted list reads as the API's plain `?:`.
 */
export const refundSaleSchema = z
  .object({
    reason: reasonSchema,
    lines: z.array(refundSaleLineSchema).optional(),
  })
  .refine(
    (data) => {
      const ids = (data.lines ?? []).map((line) => line.lineId);
      return new Set(ids).size === ids.length;
    },
    { error: 'A line can only appear once', path: ['lines'] },
  )
  .transform(withoutUnset) as unknown as ZodType<RefundSaleInput, RefundSaleFormValues>;
