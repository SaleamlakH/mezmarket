import type { ZodType } from 'zod';
import z from 'zod';
import type {
  PaymentSummaryQueryFilters,
  ReportingPeriodQueryFilters,
  TrendQueryFilters,
} from '@mez/types';
import { instant } from './helpers.js';

/** The longest window a reporting read may cover. */
const MAX_PERIOD_DAYS = 366;
/** A window at most this wide is bucketed by hour unless the caller says otherwise. */
const HOURLY_MAX_HOURS = 48;

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const periodFields = {
  from: instant('Enter a valid start date and time with a time zone'),
  to: instant('Enter a valid end date and time with a time zone'),
};

type ParsedPeriod = { from: Date; to: Date };

/** True once both bounds have been parsed into `Date` values. */
const hasDates = (period: { from: unknown; to: unknown }): period is ParsedPeriod =>
  period.from instanceof Date && period.to instanceof Date;

/** `to - from` in milliseconds. */
const spanMs = (period: ParsedPeriod) => period.to.getTime() - period.from.getTime();

/** A period must run forward in time. */
const startsBeforeEnds = (period: { from: unknown; to: unknown }) =>
  !hasDates(period) || period.from.getTime() < period.to.getTime();

/** A period cannot cover more than a year and a day. */
const withinMaxSpan = (period: { from: unknown; to: unknown }) =>
  !hasDates(period) || spanMs(period) <= MAX_PERIOD_DAYS * MS_PER_DAY;

/**
 * The reporting window every dashboard read carries: a required `from` and
 * `to`, each a universal ISO 8601 instant, with `from` strictly before `to`
 * and a span no wider than 366 days.
 */
export const periodQuerySchema = z
  .object(periodFields)
  .refine(startsBeforeEnds, {
    error: 'The period start must be before its end',
    path: ['from'],
  })
  .refine(withinMaxSpan, {
    error: 'The period cannot span more than 366 days',
    path: ['to'],
  }) satisfies ZodType<ReportingPeriodQueryFilters>;

/** The dashboard summary reads over the same window as every period read. */
export const dashboardSummaryQuerySchema = periodQuerySchema;

/** A member's performance reads over the same window as every period read. */
export const memberPerformanceQuerySchema = periodQuerySchema;

/**
 * A gross-profit trend read: a reporting window plus an optional bucket.
 * `hour` is refused beyond 48 hours, and the bucket defaults to `hour` for a
 * window of 48 hours or less and to `day` otherwise.
 */
export const trendQuerySchema = z
  .object({
    ...periodFields,
    bucket: z.enum(['hour', 'day'], { error: 'Select a valid trend bucket' }).optional(),
  })
  .refine(startsBeforeEnds, {
    error: 'The period start must be before its end',
    path: ['from'],
  })
  .refine(withinMaxSpan, {
    error: 'The period cannot span more than 366 days',
    path: ['to'],
  })
  .superRefine((period, ctx) => {
    if (!hasDates(period) || !startsBeforeEnds(period) || !withinMaxSpan(period)) return;
    if (period.bucket === 'hour' && spanMs(period) > HOURLY_MAX_HOURS * MS_PER_HOUR) {
      ctx.addIssue({
        code: 'custom',
        path: ['bucket'],
        message: 'An hourly trend cannot span more than 48 hours',
      });
    }
  })
  .transform(
    (period): TrendQueryFilters => ({
      from: period.from,
      to: period.to,
      bucket: period.bucket ?? (spanMs(period) <= HOURLY_MAX_HOURS * MS_PER_HOUR ? 'hour' : 'day'),
    }),
  ) satisfies ZodType<TrendQueryFilters>;

/**
 * A payment breakdown read: a reporting window plus an optional `groupBy`,
 * which only ever groups by `method` and defaults to it.
 */
export const paymentSummaryQuerySchema = z
  .object({
    ...periodFields,
    groupBy: z.enum(['method'], { error: 'Select a valid grouping' }).optional().default('method'),
  })
  .refine(startsBeforeEnds, {
    error: 'The period start must be before its end',
    path: ['from'],
  })
  .refine(withinMaxSpan, {
    error: 'The period cannot span more than 366 days',
    path: ['to'],
  }) satisfies ZodType<PaymentSummaryQueryFilters>;
