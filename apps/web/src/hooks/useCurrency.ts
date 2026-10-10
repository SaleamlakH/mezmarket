import { useBusinessContext } from '@/providers/business/useBusinessContext';

/** The active business's currency, with a fallback so amounts always render. */
export function useCurrency(): string {
  const { currentBusiness } = useBusinessContext();
  return currentBusiness?.currencyCode ?? 'ETB';
}
