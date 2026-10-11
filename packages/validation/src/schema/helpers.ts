import type { ZodType } from 'zod';
import z from 'zod';

/**
 * The coercions the form-to-payload schemas share. They follow one rule: take
 * text as the form hands it over, accept the already-typed value the wire may
 * carry, and hand back the domain type — without `z.preprocess`, which would
 * widen the schema's input to `unknown` and cost the `satisfies ZodType` guard.
 */

/** A field left blank is recorded as "no value" rather than an empty string. */
export const blankIsUnset = (value: string) => (value === '' ? undefined : value);

/** Required text input: a missing field and a blank one report alike. */
export const requiredText = (message: string) =>
  z.string({ error: message }).trim().min(1, message);

/** Optional text input: blank becomes `undefined`. */
export const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).transform(blankIsUnset).optional();

/**
 * A universal instant: a full ISO 8601 date, time and zone — `Z` or an
 * explicit `±HH:MM` offset, both naming the same absolute moment. A date-only
 * value or a naive clock carries no instant and is refused, never guessed at.
 */
export const instant = (error: string) =>
  z.iso.datetime({ offset: true, error }).transform((value) => new Date(value));

/** Required instant input: text in, `Date` out. */
export const requiredInstant = (label: string) =>
  requiredText(`${label} is required`).pipe(
    instant('Enter a valid date and time with a time zone'),
  );

/** Optional instant input: blank becomes `undefined`. */
export const optionalInstant = z
  .string()
  .trim()
  .transform(blankIsUnset)
  .optional()
  .pipe(instant('Enter a valid date and time with a time zone').optional());

/** Refuses an instant later than the current moment; an unset value passes. */
export const notAfterNow = <T extends ZodType>(schema: T, message: string) =>
  schema.refine((value) => value === undefined || (value as Date).getTime() <= Date.now(), {
    error: message,
  });

/** Rounds a number to the decimal places a column keeps. */
export const toStoredPrecision = (decimals: number) => (value: number) =>
  Number(value.toFixed(decimals));

/**
 * Required numeric input: text or a number in, number out at the column's
 * precision. The form sends text; the wire also carries numbers a client has
 * already parsed, and both transform alike.
 */
export const numberFromString = (label: string, decimals: number) =>
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

/**
 * Optional enum input: a select left on its placeholder is blank, which reads
 * as "no value" rather than an unknown option. The runtime check accepts any
 * text and narrows it; the cast pins the form's own type back on, so the
 * `satisfies` guard sees the option a user picked rather than an open string.
 */
export const optionalEnum = <const T extends readonly [string, ...string[]]>(
  values: T,
  message: string,
): z.ZodOptional<ZodType<T[number], T[number]>> =>
  z
    .string({ error: message })
    .trim()
    .transform(blankIsUnset)
    .optional()
    .pipe(z.enum(values, { error: message }).optional()) as unknown as z.ZodOptional<
    ZodType<T[number], T[number]>
  >;

/**
 * Drops keys left unset, so the parsed payload matches the API's
 * `?: string` shape instead of carrying an explicit `undefined`.
 */
export function withoutUnset<T extends object>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as {
    [K in keyof T]: Exclude<T[K], undefined>;
  };
}
