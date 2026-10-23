import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ApiClient } from '@/lib/apiClient';
import type {
  CreateSaleInput,
  CreateSaleResponse,
  RecordPaymentInput,
  SaleDetailResponse,
  SaleSummaryResponse,
} from '@mez/types';
import { createSalesService } from './salesService';

const client = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as ApiClient;

const createInput: CreateSaleInput = {
  lines: [{ productId: 'prod_tequila', productUnitId: 'unit_tequila_bottle', quantity: 2 }],
};

describe('createSalesService', () => {
  let service: ReturnType<typeof createSalesService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createSalesService(client);
  });

  it('getSales calls GET /api/businesses/:businessId/sales and returns the array', async () => {
    const sale = {} as SaleSummaryResponse;
    vi.mocked(client.get).mockResolvedValue([sale]);

    const result = await service.getSales('biz_1');

    expect(client.get).toHaveBeenCalledWith('/api/businesses/biz_1/sales');
    expect(result).toEqual([sale]);
  });

  it('getSales appends only the filters that were set', async () => {
    vi.mocked(client.get).mockResolvedValue([]);

    await service.getSales('biz_1', { unpaid: true });

    expect(client.get).toHaveBeenCalledWith('/api/businesses/biz_1/sales?unpaid=true');
  });

  it('getSales carries a payment status filter', async () => {
    vi.mocked(client.get).mockResolvedValue([]);

    await service.getSales('biz_1', { status: 'PARTIALLY_PAID' });

    expect(client.get).toHaveBeenCalledWith('/api/businesses/biz_1/sales?status=PARTIALLY_PAID');
  });

  it('getSales carries every filter together', async () => {
    vi.mocked(client.get).mockResolvedValue([]);

    await service.getSales('biz_1', {
      status: 'PAID',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-31T23:59:59.999Z',
      productId: 'prod_1',
      unpaid: false,
    });

    expect(client.get).toHaveBeenCalledWith(
      '/api/businesses/biz_1/sales?status=PAID&from=2026-01-01T00%3A00%3A00.000Z&to=2026-01-31T23%3A59%3A59.999Z&productId=prod_1&unpaid=false',
    );
  });

  it('getSale calls GET /api/businesses/:businessId/sales/:saleId', async () => {
    const detail = {} as SaleDetailResponse;
    vi.mocked(client.get).mockResolvedValue(detail);

    const result = await service.getSale('biz_1', 'sale_1');

    expect(client.get).toHaveBeenCalledWith('/api/businesses/biz_1/sales/sale_1');
    expect(result).toBe(detail);
  });

  it('createSale posts to /api/businesses/:businessId/sales and returns the response', async () => {
    const response = {} as CreateSaleResponse;
    vi.mocked(client.post).mockResolvedValue(response);

    const result = await service.createSale('biz_1', createInput);

    expect(client.post).toHaveBeenCalledWith('/api/businesses/biz_1/sales', createInput);
    expect(result).toBe(response);
  });

  it('recordPayment posts to the sale payments route and returns the fresh sale', async () => {
    const detail = {} as SaleDetailResponse;
    const input: RecordPaymentInput = { status: 'PARTIALLY_PAID', amount: 500, method: 'CASH' };
    vi.mocked(client.post).mockResolvedValue(detail);

    const result = await service.recordPayment('biz_1', 'sale_1', input);

    expect(client.post).toHaveBeenCalledWith('/api/businesses/biz_1/sales/sale_1/payments', input);
    expect(result).toBe(detail);
  });
});
