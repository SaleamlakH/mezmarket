import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ApiClient } from '@/lib/apiClient';
import type { CreateCustomerInput, CustomerResponse } from '@mez/types';
import { createCustomersService } from './customersService';

const client = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as ApiClient;

const createInput: CreateCustomerInput = { name: 'Ada', contactPhone: '0911' };

describe('createCustomersService', () => {
  let service: ReturnType<typeof createCustomersService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createCustomersService(client);
  });

  it('listCustomers calls GET /api/businesses/:businessId/customers and returns the array', async () => {
    const customer: CustomerResponse = {
      id: 'c1',
      businessId: 'biz_1',
      name: 'Ada',
      contactPhone: null,
      contactEmail: null,
      active: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    vi.mocked(client.get).mockResolvedValue([customer]);

    const result = await service.listCustomers('biz_1');

    expect(client.get).toHaveBeenCalledWith('/api/businesses/biz_1/customers');
    expect(result).toEqual([customer]);
  });

  it('createCustomer posts to /api/businesses/:businessId/customers and returns the response', async () => {
    const response = {} as CustomerResponse;
    vi.mocked(client.post).mockResolvedValue(response);

    const result = await service.createCustomer('biz_1', createInput);

    expect(client.post).toHaveBeenCalledWith('/api/businesses/biz_1/customers', createInput);
    expect(result).toBe(response);
  });
});
