import type { ZodType } from 'zod';
import z from 'zod';
import type { PaymentStatus, SaleListFilters } from '@mez/types';
import { PAYMENT_STATUSES } from './sales.schema.js';
import { blankIsUnset, withoutUnset } from './helpers.js';

/** The exact rule `instant` applies to a text instant, without converting it. */
const isoInstant = z.iso.datetime({ offset: true });

/** Required text that must name a universal ISO 8601 instant; blank is no filter. */
const instantText = (message: string) =>
  z
    .string({ error: message })
    .trim()
    .transform(blankIsUnset)
    .refine((value) => value === undefined || isoInstant.safeParse(value).success, {
      error: message,
    });

const optionalInstantText = instantText('Enter a valid date and time with a time zone').optional();

/** A boolean query flag, also accepting the strings `'true'` and `'false'`. */
const booleanFlag = z
  .union([z.boolean(), z.enum(['true', 'false'], { error: 'Enter true or false' })])
  .transform((value) => value === true || value === 'true')
  .optional();

/**
 * The web sends `status` as a comma-separated list such as
 * `status=paid,partially_paid`. Blank is no filter, whitespace and case are
 * ignored, and the canonical enum spelling is returned.
 */
const paymentStatusList = z
  .string({ error: 'Select a valid payment status' })
  .trim()
  .transform((value) => {
    if (value === '') return undefined;
    const statuses = value
      .split(',')
      .map((status) => status.trim().toUpperCase())
      .filter((status) => status.length > 0);
    return statuses.length === 0 ? undefined : [...new Set(statuses)];
  })
  .optional()
  .refine(
    (statuses) =>
      statuses === undefined ||
      statuses.every((status) => (PAYMENT_STATUSES as readonly string[]).includes(status)),
    { error: 'Select a valid payment status' },
  )
  .transform((statuses) => statuses as PaymentStatus[] | undefined);

/**
 * Filters a sale-history request may carry.
 *
 * `from` and `to` bound the sale datetime inclusively, and `paymentFrom` and
 * `paymentTo` bound a payment's paid-at timestamp inclusively. `status` is the
 * comma-separated list the web builds, and each member must name a payment
 * status. `overdue` implies `unpaid`: an `overdue` request with `unpaid` left
 * unset is coerced to `unpaid: true`.
 */
export const saleListFiltersSchema = z
  .object({
    status: paymentStatusList,
    from: optionalInstantText,
    to: optionalInstantText,
    productId: z.string().trim().transform(blankIsUnset).optional(),
    paymentFrom: optionalInstantText,
    paymentTo: optionalInstantText,
    unpaid: booleanFlag,
    overdue: booleanFlag,
  })
  .refine(
    (value) => {
      if (value.from === undefined || value.to === undefined) return true;
      const from = new Date(value.from).getTime();
      const to = new Date(value.to).getTime();
      if (Number.isNaN(from) || Number.isNaN(to)) return true;
      return from <= to;
    },
    {
      error: 'The start must be on or before the end',
      path: ['from'],
    },
  )
  .refine(
    (value) => {
      if (value.paymentFrom === undefined || value.paymentTo === undefined) return true;
      const from = new Date(value.paymentFrom).getTime();
      const to = new Date(value.paymentTo).getTime();
      if (Number.isNaN(from) || Number.isNaN(to)) return true;
      return from <= to;
    },
    {
      error: 'The start must be on or before the end',
      path: ['paymentFrom'],
    },
  )
  .transform((value) =>
    withoutUnset({ ...value, unpaid: value.overdue === true ? true : value.unpaid }),
  ) satisfies ZodType<SaleListFilters>;
