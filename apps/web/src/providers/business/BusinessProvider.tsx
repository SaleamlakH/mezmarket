import { BusinessContext } from './context';
import { useBusinessService } from './useBusinessService';
import type { BusinessProviderProps } from './types';

export function BusinessProvider({ userId, businessService, children }: BusinessProviderProps) {
  const contextValue = useBusinessService(userId, businessService);
  return <BusinessContext value={contextValue}>{children}</BusinessContext>;
}
