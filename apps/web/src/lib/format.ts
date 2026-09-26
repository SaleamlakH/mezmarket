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
