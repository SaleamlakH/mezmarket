import { useMemo } from 'react';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { saleTotals, type SaleTotalsPreview } from '../lib/saleTotals';
import { useSaleDraftView } from './useSaleDraftView';

/**
 * The running subtotal, tax and total the draft sale would be created with —
 * a preview only, from the business's own tax config. The server computes the
 * real figures once the sale is wired up.
 */
export function useSaleDraftTotals(): SaleTotalsPreview {
  const { currentBusiness } = useBusinessContext();
  const taxOnSales = currentBusiness?.taxOnSales ?? false;
  const taxRate = taxOnSales ? (currentBusiness?.defaultTaxRate ?? 0) : 0;
  const { total } = useSaleDraftView();

  return useMemo(
    () => ({ ...saleTotals(total, taxRate), taxRate, taxOnSales }),
    [total, taxRate, taxOnSales],
  );
}
