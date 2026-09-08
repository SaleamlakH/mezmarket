import { createContext } from 'react';
import type { BusinessContextValue } from './types';

export const BusinessContext = createContext<BusinessContextValue | null>(null);
