import type { CreateCustomerInput, CustomerSummary } from '@mez/types';

import type { Customer as CustomerRecord } from '../../../generated/prisma/client.js';

export type {
  CreateCustomerInput,
  CreateCustomerResponse,
  CreateCustomerResult,
  Customer,
  CustomerResponse,
  CustomerSummary,
  CustomerSummaryResponse,
} from '@mez/types';

export type CustomerRepository = {
  listCustomers(businessId: string): Promise<CustomerRecord[]>;
  createCustomer(businessId: string, input: CreateCustomerInput): Promise<CustomerRecord>;
};

export type CustomerService = {
  /** The business's customers as picker summaries, by name. */
  listCustomers(businessId: string): Promise<CustomerSummary[]>;
  createCustomer(businessId: string, input: CreateCustomerInput): Promise<CustomerRecord>;
};
