import type { ZodType } from 'zod';
import z from 'zod';
import type {
  InventoryExpiryStatus,
  ProductInventoryDetailFilters,
  ProductInventoryListFilters,
  StockStatus,
} from '@mez/types';
import { optionalInstant, withoutUnset } from './helpers.js';
import { PRODUCT_LIST_STATUSES } from '../product/filters.schema.js';

/**
 * Which products a list request wants. Absent means the active ones only,
 * mirroring the product list.
 */
const productListStatusSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.enum(PRODUCT_LIST_STATUSES, { error: 'Invalid product status' }).optional().default('active'),
);

/** The lowercase CSV spelling of each canonical stock status. */
const canonicalStockStatus = {
  low_stock: 'LOW_STOCK',
  out_of_stock: 'OUT_OF_STOCK',
  in_stock: 'IN_STOCK',
} as const satisfies Record<string, StockStatus>;

const stockStatusKeys = Object.keys(canonicalStockStatus) as [
  keyof typeof canonicalStockStatus,
  ...(keyof typeof canonicalStockStatus)[],
];

const expiryStatusValues = ['expired', 'soon'] as const satisfies readonly InventoryExpiryStatus[];

/**
 * A comma-separated query value parsed into a list of canonical enum members.
 * Blank reads as no filter, surrounding whitespace is ignored, matching is
 * case-insensitive, and an unrecognized member is reported on the field itself
 * rather than on its position in the list.
 */
const csvEnum = <const T extends readonly [string, ...string[]]>(values: T, message: string) => {
  const allowed = values as readonly string[];
  return z
    .string({ error: message })
    .trim()
    .transform((value) => {
      if (value === '') return undefined;
      const parts = value
        .split(',')
        .map((part) => part.trim().toLowerCase())
        .filter((part) => part.length > 0);
      return parts.length === 0 ? undefined : parts;
    })
    .optional()
    .refine((list) => list === undefined || list.every((entry) => allowed.includes(entry)), {
      error: message,
    })
    .transform((list) => list as T[number][] | undefined);
};

/** Stock-status CSV normalized to the canonical `StockStatus[]`. */
const stockStatusSchema = csvEnum(stockStatusKeys, 'Invalid stock status').transform((values) =>
  values?.map((value) => canonicalStockStatus[value]),
);

/** Expiry-status CSV normalized to the canonical `InventoryExpiryStatus[]`. */
const expiryStatusSchema = csvEnum(expiryStatusValues, 'Invalid expiry status');

/**
 * Filters the inventory list may carry.
 */
export const productInventoryListQuerySchema = z
  .object({
    expiryBefore: optionalInstant,
    status: productListStatusSchema,
    stockStatus: stockStatusSchema,
    expiryStatus: expiryStatusSchema,
  })
  .transform(withoutUnset) satisfies ZodType<ProductInventoryListFilters>;

export const productInventoryDetailQuerySchema = z.object({
  expiryBefore: optionalInstant,
}) satisfies ZodType<ProductInventoryDetailFilters>;
