import type { ZodType } from 'zod';
import z from 'zod';

/**
 * Coercions shared by the form-to-payload schemas. Each takes the text a form hands
 * over, accepts the already-typed value the wire may carry, and returns the domain
 * type — without `z.preprocess`, which would widen the input to `unknown` and lose the
 * `satisfies ZodType` guard.
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
 * A universal instant: a full ISO 8601 date, time and zone (`Z` or an explicit
 * `±HH:MM` offset). A date-only or naive-clock value carries no instant and is
 * refused, never guessed at.
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
 * Required numeric input: text or a number in, number out at the column's precision.
 * `decimals` is optional; when it is left out the value is never rounded.
 */
export const numberFromString = (label: string, decimals?: number) =>
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
        .transform((value) =>
          decimals === undefined ? value : toStoredPrecision(decimals)(value),
        ),
    );

/**
 * Optional numeric input: a blank field reads as "no value" rather than zero. Used
 * where a value is required only for some of another field's values. Like
 * `numberFromString` it also accepts an already-parsed number so the input type is
 * not widened to `unknown`; omitting `decimals` leaves the value unrounded.
 */
export const optionalNumberFromString = (label: string, decimals?: number) =>
  z
    .union([z.literal(''), numberFromString(label, decimals)])
    .transform((value) => (value === '' ? undefined : value))
    .optional();

/**
 * A nullable text field an edit can clear: an absent field is left untouched, a blank
 * or explicit `null` clears it, and any text replaces it. Unlike `optionalText`, a
 * blank is meaning rather than absence.
 */
export const clearableText = (max: number, message: string) =>
  z
    .union([z.string().trim().max(max, message), z.null()])
    .transform((value) => (value === null || value === '' ? null : value))
    .optional();

/**
 * A nullable numeric field an edit can clear, following `clearableText`: absent
 * leaves it, blank or `null` clears it, and a number replaces it.
 */
export const clearableNumber = (label: string) =>
  z
    .union([z.literal(''), z.null(), numberFromString(label)])
    .transform((value) => (value === '' || value === null ? null : value))
    .optional();

/**
 * Optional enum input: a select left on its placeholder is blank, which reads as "no
 * value". The cast pins the form's own type back on so the `satisfies` guard sees the
 * picked option rather than an open string.
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
 * Required text whose absence is an ordinary issue, not a fatal `invalid_type`.
 * Use this where another field's rule still needs to run even when this one is
 * missing (for example a unit that is only required when another unit is picked).
 */
export const nonFatalRequiredText = (message: string, max?: number, maxMessage?: string) => {
  const schema = z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((value) => (value ?? '').trim())
    .refine((value) => value.length > 0, { error: message });

  return max === undefined
    ? schema
    : schema.refine((value) => value.length <= max, { error: maxMessage ?? message });
};

/**
 * Required positive numeric input whose absence or bad text is an ordinary issue.
 * Unlike `numberFromString` the value is not piped through `z.number`, so a bad
 * sibling field never aborts the whole object.
 */
export const positiveNumberFromString = (
  invalidMessage: string,
  positiveMessage: string,
  decimals?: number,
) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .optional()
    .transform((value) => {
      if (value == null || (typeof value === 'string' && value.trim() === '')) {
        return Number.NaN;
      }
      return Number(value);
    })
    .refine((value) => Number.isFinite(value), { error: invalidMessage })
    .refine((value) => value > 0, { error: positiveMessage })
    .transform((value) => (decimals === undefined ? value : toStoredPrecision(decimals)(value)));

/**
 * Drops keys left unset, so the parsed payload matches the API's
 * `?: string` shape instead of carrying an explicit `undefined`.
 */
export function withoutUnset<T extends object>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as {
    [K in keyof T]: Exclude<T[K], undefined>;
  };
}
