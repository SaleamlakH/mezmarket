/**
 * Presentation formatting helpers. These only turn stored values into the
 * strings the UI shows — no business meaning is attached to any of them.
 */

/** Formats an amount of money in the given ISO 4217 currency code. */
export function formatMoney(
  amount: number | null | undefined,
  currency: string,
  unit?: string,
): string | undefined {
  if (amount === null || amount === undefined) return undefined;
  const money = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return unit ? `${money} / ${unit}` : money;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/**
 * Formats a quantity the way it was entered: whole numbers stay whole, and
 * at most four decimal places are shown, matching the precision a quantity
 * is stored at.
 */
export function formatQuantity(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value);
}

/**
 * Formats a date as a plain calendar day, e.g. `5 Jan 2026`. Takes either an
 * ISO 8601 instant or the `YYYY-MM-DD` value a date input produces.
 */
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Formats a stored instant as the day and clock time in the viewer's own
 * zone, e.g. `5 Jan 2026, 12:00`. This is presentation only — the stored
 * moment is unchanged by where it is read.
 */
export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Formats a stored ISO 8601 instant as the `YYYY-MM-DDTHH:mm` value a
 * `datetime-local` input expects, in the viewer's own zone — the picker works
 * in local wall clock, so the instant is shown in local terms to be edited.
 */
export function instantToDatetimeLocalValue(instant: string): string {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * Converts a `datetime-local` value — a local wall-clock date and time with no
 * zone — into its absolute UTC ISO instant. The browser reads the value in the
 * viewer's own zone, so the local choice becomes universal here, exactly once.
 * A blank field stays blank, and a value the input could not have produced is
 * passed through untouched so validation reports it.
 */
export function datetimeLocalToInstant(value: string): string {
  if (value === '') return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
