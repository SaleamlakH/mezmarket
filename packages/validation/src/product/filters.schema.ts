import z from 'zod';
import type { ProductListFilters, ProductListStatus } from '@mez/types';

/**
 * Which products a list request wants. Absent means the active ones only, so
 * the surfaces that pick products to transact default to a usable set without
 * asking; the catalog passes `all` to show every product, inactive ones marked.
 */
export const PRODUCT_LIST_STATUSES = [
  'active',
  'inactive',
  'all',
] as const satisfies readonly ProductListStatus[];

const productListStatusSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.enum(PRODUCT_LIST_STATUSES, { error: 'Invalid product status' }).optional().default('active'),
);

export const productListQuerySchema = z.object({
  status: productListStatusSchema,
}) satisfies z.ZodType<ProductListFilters>;
