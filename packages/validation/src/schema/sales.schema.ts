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

/** Mirrors `PaymentMethod` in @mez/types, so the two cannot drift. */
export const PAYMENT_METHODS = [
  'CASH',
  'CARD',
  'BANK_TRANSFER',
  'MOBILE_MONEY',
  'OTHER',
] as const satisfies readonly PaymentMethod[];

/**
 * Mirrors `PaymentStatus` in @mez/types; complete, since a caller's status is
 * always accepted.
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
 * Ties the amount and method to the status they are given with: a partial
 * payment cannot be recorded without an amount, a pending sale records no
 * payment at all, and a recorded payment must name how it was taken — a
 * pending sale carries no method. A paid sale may omit the amount — the
 * server settles the balance.
 */
const checkPayment = (
  payment: {
    status: PaymentStatus;
    amount?: number | undefined;
    method?: PaymentMethod | undefined;
  },
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

  if (payment.status !== 'PENDING' && payment.method === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['method'],
      message: 'Select a payment method',
    });
  }
};

/**
 * A payment as submitted. The cast pins the form shape (a blank select arrives
 * as unset) back on so the `satisfies` guards stay meaningful without widening
 * `PaymentInput` for `exactOptionalPropertyTypes`.
 */
const paymentSchema = z
  .strictObject(paymentFields)
  .superRefine(checkPayment)
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
 * A blank payment block means the form's payment section was left untouched;
 * dropped before parsing so no required error fires for a payment nobody
 * entered (`z.preprocess` is the only stage that can decide this).
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
 * Records a sale and confirms it in one action.
 */
export const createSaleSchema = z
  .object({
    saleDatetime: notAfterNow(optionalInstant, 'Sale date cannot be in the future'),
    lines: saleLines(createSaleLineSchema),
    initialPayment: initialPaymentSchema,
    /** A customer row selected from the list; a blank selection is no customer. */
    customerId: z.string().trim().transform(blankIsUnset).optional(),
    /** A server selected from the member list; a blank selection is no server. */
    serverMemberId: z.string().trim().transform(blankIsUnset).optional(),
    // The discount feeds the sale's totals, which round it once — not here.
    discount: optionalNumberFromString('Discount').pipe(
      z.number().min(0, 'Discount must be at least 0').optional(),
    ),
  })
  .transform(withoutUnset) satisfies ZodType<CreateSaleInput, SaleFormValues>;

/**
 * Edits a recorded sale in place: a line with an `id` updates, one without is
 * added, and lines absent from the payload are removed.
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

/** One line's restock choice in a refund. */
export const refundSaleLineSchema = z.strictObject({
  lineId: requiredText('Select a line'),
  restock: z.boolean(),
}) satisfies ZodType<RefundSaleLineInput, RefundSaleLineFormValues>;

/**
 * Refunds a sale. A line left out follows its product's default restock
 * behavior; `lines` is asserted because zod's `optional` hands over an
 * `undefined` the plain contract will not admit.
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
