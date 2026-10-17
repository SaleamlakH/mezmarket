import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { CustomerRepository } from './customers.types.js';

export function createCustomersRepository(prisma: PrismaClient): CustomerRepository {
  return {
    /** The business's active customers, by name, for a picker to offer. */
    async listCustomers(businessId) {
      return prisma.customer.findMany({
        where: { businessId, active: true },
        orderBy: { name: 'asc' },
      });
    },

    async createCustomer(businessId, input) {
      return prisma.customer.create({
        data: {
          businessId,
          name: input.name,
          contactPhone: input.contactPhone ?? null,
          contactEmail: input.contactEmail ?? null,
        },
      });
    },
  };
}
