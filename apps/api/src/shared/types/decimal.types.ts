/**
 * A `Decimal` column as Prisma hands it back. Callers narrow these to the plain
 * numbers the wire contracts use.
 */
export type StoredDecimal = {
  toNumber(): number;
};
