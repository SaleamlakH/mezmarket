import type { ZodType } from 'zod';
import z from 'zod';
import type { ProductInventoryDetailFilters, ProductInventoryListFilters } from '@mez/types';
import { optionalInstant } from './helpers.js';

/**
 * Filters the inventory list may carry.
 *
 * Without `expiryBefore` the API measures
 * expiry against the moment of the request.
 */
export const productInventoryListQuerySchema = z.object({
  expiryBefore: optionalInstant,
}) satisfies ZodType<ProductInventoryListFilters>;

export const productInventoryDetailQuerySchema = z.object({
  expiryBefore: optionalInstant,
}) satisfies ZodType<ProductInventoryDetailFilters>;
