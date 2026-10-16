import { CustomersContext } from './context';
import type { CustomersProviderProps } from './types';

export function CustomersProvider({ customersService, children }: CustomersProviderProps) {
  return <CustomersContext value={customersService}>{children}</CustomersContext>;
}
