import { useMemo } from 'react';
import type { TaxDisplayMode } from '@mez/types';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { saleTotals, type SaleTotals } from '../lib/saleTotals';
import { useSaleDraftView } from './useSaleDraftView';

export interface SaleDraftTotalsPreview extends SaleTotals {
  taxRate: number;
  taxDisplayMode: TaxDisplayMode;
}

/**
 * The running subtotal, tax and total the draft sale would be created with —
 * a preview only, from the business's own tax config. The server computes the
 * real figures once the sale is wired up.
 */
export function useSaleDraftTotals(): SaleDraftTotalsPreview {
  const { currentBusiness } = useBusinessContext();
  const taxRate = currentBusiness?.defaultTaxRate ?? 0;
  const taxDisplayMode: TaxDisplayMode = currentBusiness?.taxDisplayMode ?? 'EXCLUSIVE';
  const { total } = useSaleDraftView();

  return useMemo(
    () => ({ ...saleTotals(total, taxRate, taxDisplayMode), taxRate, taxDisplayMode }),
    [total, taxRate, taxDisplayMode],
  );
}
