import { useContext } from 'react';
import { BusinessContext } from './context';
import type { BusinessContextValue } from './types';

export function useBusinessContext(): BusinessContextValue {
  const context = useContext(BusinessContext);

  if (!context) {
    throw new Error('useBusinessContext must be used within a BusinessProvider');
  }

  return context;
}
