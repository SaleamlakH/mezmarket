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

/** Formats a `Date` as the `YYYY-MM-DD` value a date input expects. */
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a stored ISO 8601 instant as the `YYYY-MM-DD` value a date input
 * expects. The instant's own UTC calendar day is shown, so the day never
 * shifts with the viewer's time zone.
 */
export function instantToDateInputValue(instant: string): string {
  return instant.slice(0, 10);
}

/**
 * Records what a date input produces as the UTC instant the batch schemas
 * expect. A blank field stays blank, and a value the date input could not
 * have produced is passed through untouched so validation reports it.
 */
export function dateInputToInstant(value: string): string {
  if (value === '') return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}
