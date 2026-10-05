import { useBusinessContext } from '@/providers/business/useBusinessContext';

/**
 * The currency the active business trades in. Falls back to a placeholder
 * only so amounts still render if the page is ever viewed outside a
 * business context.
 */
export function useCurrency(): string {
  const { currentBusiness } = useBusinessContext();
  return currentBusiness?.currencyCode ?? 'ETB';
}
