import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCustomersRepository } from '../customers.repository.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';

function createPrismaStub() {
  const customer = { findMany: vi.fn(), create: vi.fn() };
  const prisma = { customer } as unknown as PrismaClient;
  return { prisma, customer };
}

function customerRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cust-1',
    businessId: 'b-1',
    name: 'Abebe',
    contactPhone: '0911',
    contactEmail: 'abebe@example.com',
    active: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('customers.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listCustomers', () => {
    it('reads the business active customers by name', async () => {
      const { prisma, customer } = createPrismaStub();
      const repo = createCustomersRepository(prisma);
      customer.findMany.mockResolvedValue([]);

      await repo.listCustomers('b-1');

      expect(customer.findMany).toHaveBeenCalledWith({
        where: { businessId: 'b-1', active: true },
        orderBy: { name: 'asc' },
      });
    });

    it('returns the customer rows the query answered with', async () => {
      const { prisma, customer } = createPrismaStub();
      const repo = createCustomersRepository(prisma);
      const rows = [customerRecord()];
      customer.findMany.mockResolvedValue(rows);

      await expect(repo.listCustomers('b-1')).resolves.toEqual(rows);
    });
  });

  describe('createCustomer', () => {
    it('writes the customer against the business with its contact details', async () => {
      const { prisma, customer } = createPrismaStub();
      const repo = createCustomersRepository(prisma);
      customer.create.mockResolvedValue(customerRecord());

      await repo.createCustomer('b-1', {
        name: 'Abebe',
        contactPhone: '0911',
        contactEmail: 'abebe@example.com',
      });

      expect(customer.create).toHaveBeenCalledWith({
        data: {
          businessId: 'b-1',
          name: 'Abebe',
          contactPhone: '0911',
          contactEmail: 'abebe@example.com',
        },
      });
    });

    it('stores absent contact details as null', async () => {
      const { prisma, customer } = createPrismaStub();
      const repo = createCustomersRepository(prisma);
      customer.create.mockResolvedValue(customerRecord({ contactPhone: null, contactEmail: null }));

      await repo.createCustomer('b-1', { name: 'Abebe' });

      expect(customer.create).toHaveBeenCalledWith({
        data: {
          businessId: 'b-1',
          name: 'Abebe',
          contactPhone: null,
          contactEmail: null,
        },
      });
    });
  });
});
