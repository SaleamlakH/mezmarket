import { createContext } from 'react';
import type { CatalogService } from './types';

export const CatalogContext = createContext<CatalogService | null>(null);
