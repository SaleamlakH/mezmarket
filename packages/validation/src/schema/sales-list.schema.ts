import type { ZodType } from 'zod';
import z from 'zod';
import type { SaleListFilters } from '@mez/types';
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
 * Filters a sale-history request may carry.
 *
 * `from` and `to` are universal ISO 8601 instants and bound the range
 * inclusively, with `from` on or before `to`. `overdue` implies `unpaid`: an
 * `overdue` request with `unpaid` left unset is coerced to `unpaid: true`.
 */
export const saleListFiltersSchema = z
  .object({
    status: z.enum(PAYMENT_STATUSES, { error: 'Select a valid payment status' }).optional(),
    from: optionalInstantText,
    to: optionalInstantText,
    productId: z.string().trim().transform(blankIsUnset).optional(),
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
  .transform((value) =>
    withoutUnset({ ...value, unpaid: value.overdue === true ? true : value.unpaid }),
  ) satisfies ZodType<SaleListFilters>;
