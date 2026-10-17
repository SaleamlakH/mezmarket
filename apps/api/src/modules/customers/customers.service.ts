import type { Customer as CustomerRecord } from '../../../generated/prisma/client.js';
import type { CustomerRepository, CustomerService, CustomerSummary } from './customers.types.js';

function toSummary(record: CustomerRecord): CustomerSummary {
  return {
    id: record.id,
    name: record.name,
    contactPhone: record.contactPhone,
    contactEmail: record.contactEmail,
  };
}

export function createCustomersService(repository: CustomerRepository): CustomerService {
  return {
    async listCustomers(businessId) {
      const records = await repository.listCustomers(businessId);
      return records.map(toSummary);
    },

    async createCustomer(businessId, input) {
      return repository.createCustomer(businessId, input);
    },
  };
}
