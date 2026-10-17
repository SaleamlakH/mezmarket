import { createContext } from 'react';
import type { CustomersService } from './types';

export const CustomersContext = createContext<CustomersService | null>(null);
