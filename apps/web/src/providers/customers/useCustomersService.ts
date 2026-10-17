import { useContext } from 'react';
import { CustomersContext } from './context';
import type { CustomersService } from './types';

export function useCustomersService(): CustomersService {
  const context = useContext(CustomersContext);

  if (!context) {
    throw new Error('useCustomersService must be used within a CustomersProvider');
  }

  return context;
}
