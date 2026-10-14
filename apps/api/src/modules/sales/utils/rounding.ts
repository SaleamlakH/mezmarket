/** Money is kept at the `Decimal(10, 2)` the columns store. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Quantities are kept at the `Decimal(12, 4)` the columns store. */
export function roundQuantity(value: number): number {
  return Math.round(value * 10000) / 10000;
}
