import type { ReactNode } from 'react';
import type {
  DownloadUrlsResponse,
  ProductSummaryResponse,
  ProductUnitOptionResponse,
} from '@mez/types';

/**
 * The catalog reads more than one feature needs. Products owns the
 * implementation; inventory consumes it through this port rather than importing
 * across feature boundaries. Only the reads are here — the catalog's writes stay
 * with the products feature that owns them.
 */
export interface CatalogService {
  listProducts(businessId: string): Promise<ProductSummaryResponse[]>;
  getProductUnits(businessId: string, productId: string): Promise<ProductUnitOptionResponse[]>;
  getProductUploadUrls(businessId: string): Promise<DownloadUrlsResponse>;
}

export interface CatalogProviderProps {
  catalogService: CatalogService;
  children: ReactNode;
}
