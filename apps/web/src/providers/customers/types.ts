import type { ReactNode } from 'react';
import type {
  CreateCustomerInput,
  CreateCustomerResponse,
  CustomerSummaryResponse,
} from '@mez/types';

/** Customer list + create, ported so the sale flow needs no customers feature import. */
export interface CustomersService {
  listCustomers(businessId: string): Promise<CustomerSummaryResponse[]>;
  createCustomer(businessId: string, input: CreateCustomerInput): Promise<CreateCustomerResponse>;
}

export interface CustomersProviderProps {
  customersService: CustomersService;
  children: ReactNode;
}
