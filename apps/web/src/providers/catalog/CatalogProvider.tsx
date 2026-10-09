import { CatalogContext } from './context';
import type { CatalogProviderProps } from './types';

export function CatalogProvider({ catalogService, children }: CatalogProviderProps) {
  return <CatalogContext value={catalogService}>{children}</CatalogContext>;
}
