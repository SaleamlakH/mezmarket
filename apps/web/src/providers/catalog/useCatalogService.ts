import { useContext } from 'react';
import { CatalogContext } from './context';
import type { CatalogService } from './types';

export function useCatalogService(): CatalogService {
  const context = useContext(CatalogContext);

  if (!context) {
    throw new Error('useCatalogService must be used within a CatalogProvider');
  }

  return context;
}
