import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ApiClient } from '@/lib/apiClient';
import type {
  CreateBatchInput,
  ProductInventorySummaryResponse,
  StockBatchDetailResponse,
} from '@mez/types';
import { createInventoryService } from './inventoryService';

const client = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
} as unknown as ApiClient;

describe('createInventoryService', () => {
  let service: ReturnType<typeof createInventoryService>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createInventoryService(client);
  });

  it('getBatches calls GET /api/businesses/:businessId/inventory/batches and returns array', async () => {
    const batch = {} as StockBatchDetailResponse;
    vi.mocked(client.get).mockResolvedValue([batch]);

    const result = await service.getBatches('biz_1');

    expect(client.get).toHaveBeenCalledWith('/api/businesses/biz_1/inventory/batches');
    expect(result).toEqual([batch]);
  });

  it('getBatch calls GET /api/businesses/:businessId/inventory/batches/:batchId and returns it', async () => {
    const batch = {} as StockBatchDetailResponse;
    vi.mocked(client.get).mockResolvedValue(batch);

    const result = await service.getBatch('biz_1', 'batch_1');

    expect(client.get).toHaveBeenCalledWith('/api/businesses/biz_1/inventory/batches/batch_1');
    expect(result).toBe(batch);
  });

  it('getInventoryProducts calls GET /api/businesses/:businessId/inventory/products and returns array', async () => {
    const product = {} as ProductInventorySummaryResponse;
    vi.mocked(client.get).mockResolvedValue([product]);

    const result = await service.getInventoryProducts('biz_1');

    expect(client.get).toHaveBeenCalledWith('/api/businesses/biz_1/inventory/products');
    expect(result).toEqual([product]);
  });

  it('createBatch posts to /api/businesses/:businessId/inventory/batches and returns response', async () => {
    const response = {} as StockBatchDetailResponse;
    const input: CreateBatchInput = {
      batchDate: new Date('2026-01-01T00:00:00.000Z'),
      lines: [],
    };
    vi.mocked(client.post).mockResolvedValue(response);

    const result = await service.createBatch('biz_1', input);

    expect(client.post).toHaveBeenCalledWith('/api/businesses/biz_1/inventory/batches', input);
    expect(result).toBe(response);
  });
});
