import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCustomersService } from '../customers.service.js';
import type { CustomerRepository, CustomerService } from '../customers.types.js';
import type { Customer as CustomerRecord } from '../../../../generated/prisma/client.js';

function mockRepository(): CustomerRepository {
  return {
    listCustomers: vi.fn(),
    createCustomer: vi.fn(),
  };
}

function customerRecord(overrides: Partial<CustomerRecord> = {}): CustomerRecord {
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

let mockRepo: CustomerRepository;
let service: CustomerService;

describe('customers.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = mockRepository();
    service = createCustomersService(mockRepo);
  });

  describe('listCustomers', () => {
    it('reads the customers of the business', async () => {
      vi.mocked(mockRepo.listCustomers).mockResolvedValue([]);

      await service.listCustomers('b-1');

      expect(mockRepo.listCustomers).toHaveBeenCalledWith('b-1');
    });

    it('narrows each customer to the summary a picker shows', async () => {
      vi.mocked(mockRepo.listCustomers).mockResolvedValue([customerRecord()]);

      await expect(service.listCustomers('b-1')).resolves.toEqual([
        {
          id: 'cust-1',
          name: 'Abebe',
          contactPhone: '0911',
          contactEmail: 'abebe@example.com',
        },
      ]);
    });

    it('returns an empty list when the business has no customers', async () => {
      vi.mocked(mockRepo.listCustomers).mockResolvedValue([]);

      await expect(service.listCustomers('b-1')).resolves.toEqual([]);
    });
  });

  describe('createCustomer', () => {
    it('writes the customer against the business', async () => {
      const record = customerRecord();
      vi.mocked(mockRepo.createCustomer).mockResolvedValue(record);

      const result = await service.createCustomer('b-1', { name: 'Abebe' });

      expect(mockRepo.createCustomer).toHaveBeenCalledWith('b-1', { name: 'Abebe' });
      expect(result).toBe(record);
    });
  });
});
