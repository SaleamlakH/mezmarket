import { useContext } from 'react';
import { SaleDraftContext, type SaleDraftContextValue } from './saleDraft';

export function useSaleDraft(): SaleDraftContextValue {
  const context = useContext(SaleDraftContext);
  if (!context) {
    throw new Error('useSaleDraft must be used within a SaleDraftProvider');
  }
  return context;
}
