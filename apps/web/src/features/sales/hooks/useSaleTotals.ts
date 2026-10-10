import { useMemo } from 'react';
import type { SaleLineFormValues, TaxDisplayMode } from '@mez/types';
import { useBusinessContext } from '@/providers/business/useBusinessContext';
import { saleTotals, type SaleTotals } from '../lib/saleTotals';
import { useSaleLineList } from './useSaleLineList';

export interface SaleTotalsPreview extends SaleTotals {
  taxRate: number;
  taxDisplayMode: TaxDisplayMode;
}

/** Running subtotal, tax and total for the draft from the business's tax config. Preview only. */
export function useSaleTotals(lines: SaleLineFormValues[]): SaleTotalsPreview {
  const { currentBusiness } = useBusinessContext();
  const taxRate = currentBusiness?.defaultTaxRate ?? 0;
  const taxDisplayMode: TaxDisplayMode = currentBusiness?.taxDisplayMode ?? 'EXCLUSIVE';
  const { rows } = useSaleLineList(lines);

  return useMemo(() => {
    const linesTotal = rows.reduce((sum, row) => sum + (row.total ?? 0), 0);
    return { ...saleTotals(linesTotal, taxRate, taxDisplayMode), taxRate, taxDisplayMode };
  }, [rows, taxRate, taxDisplayMode]);
}
