import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { createBatchController } from '../batches.controller.js';
import type { BatchService, CreateBatchInput } from '../batches.types.js';

const AUTH = {
  ownerId: 'owner-1',
  businessId: 'b-1',
  branchId: 'br-1',
  memberId: 'm-1',
  role: 'OWNER',
} as const;

function input(): CreateBatchInput {
  return {
    batchDate: new Date('2026-02-01T09:00:00.000Z'),
    supplierName: 'Awash Mart',
    lines: [
      {
        productId: 'p-tequila',
        productUnitId: 'pu-bottle',
        purchaseQuantity: 10,
        purchaseUnitCost: 950,
      },
    ],
  };
}

const CREATED = { id: 'sb-1', lines: [{ id: 'sbl-1' }] };

function mockService(): BatchService {
  return {
    createBatch: vi.fn(),
    listBatches: vi.fn(),
    getBatchDetail: vi.fn(),
    listProductInventorySummaries: vi.fn(),
    getProductInventoryDetail: vi.fn(),
  };
}

describe('batches.controller', () => {
  let service: BatchService;
  let controller: ReturnType<typeof createBatchController>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockService();
    controller = createBatchController(service);
  });

  function call(
    auth: Partial<Request['auth']> | undefined,
    validBody?: unknown,
    params: Record<string, string> = {},
  ) {
    const req = { auth, validBody, params } as unknown as Request;
    const res = {
      locals: {},
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    return { req, res };
  }

  describe('createBatch', () => {
    it('answers 201 with the batch the service created', async () => {
      vi.mocked(service.createBatch).mockResolvedValue(CREATED as never);
      const { req, res } = call(AUTH, input());

      await controller.createBatch(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(CREATED);
    });

    it('hands the service the resolved scope and the body the validation middleware stored', async () => {
      vi.mocked(service.createBatch).mockResolvedValue(CREATED as never);
      const { req, res } = call(AUTH, input());

      await controller.createBatch(req, res);

      expect(service.createBatch).toHaveBeenCalledWith(
        { businessId: 'b-1', branchId: 'br-1', memberId: 'm-1' },
        input(),
      );
    });

    it('lets a rejected service call propagate to the error handler', async () => {
      vi.mocked(service.createBatch).mockRejectedValue(new Error('db down'));
      const { req, res } = call(AUTH, input());

      await expect(controller.createBatch(req, res)).rejects.toThrow('db down');
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('listBatches', () => {
    it('answers 200 with the batches the service listed', async () => {
      vi.mocked(service.listBatches).mockResolvedValue([]);
      const { req, res } = call(AUTH);

      await controller.listBatches(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('lists the resolved business and branch', async () => {
      vi.mocked(service.listBatches).mockResolvedValue([]);
      const { req, res } = call(AUTH);

      await controller.listBatches(req, res);

      expect(service.listBatches).toHaveBeenCalledWith({ businessId: 'b-1', branchId: 'br-1' });
    });

    it('lets a rejected service call propagate to the error handler', async () => {
      vi.mocked(service.listBatches).mockRejectedValue(new Error('db down'));
      const { req, res } = call(AUTH);

      await expect(controller.listBatches(req, res)).rejects.toThrow('db down');
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('getBatchDetail', () => {
    it('answers 200 with the batch the service read', async () => {
      vi.mocked(service.getBatchDetail).mockResolvedValue(CREATED as never);
      const { req, res } = call(AUTH, undefined, { batchId: 'sb-1' });

      await controller.getBatchDetail(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(CREATED);
    });

    it('hands the service the resolved scope and the batch id from params', async () => {
      vi.mocked(service.getBatchDetail).mockResolvedValue(CREATED as never);
      const { req, res } = call(AUTH, undefined, { batchId: 'sb-1' });

      await controller.getBatchDetail(req, res);

      expect(service.getBatchDetail).toHaveBeenCalledWith(
        { businessId: 'b-1', branchId: 'br-1' },
        'sb-1',
      );
    });

    it('lets a rejected service call propagate to the error handler', async () => {
      vi.mocked(service.getBatchDetail).mockRejectedValue(new Error('db down'));
      const { req, res } = call(AUTH, undefined, { batchId: 'sb-1' });

      await expect(controller.getBatchDetail(req, res)).rejects.toThrow('db down');
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('listProductInventorySummaries', () => {
    it('answers 200 with the summaries the service listed', async () => {
      vi.mocked(service.listProductInventorySummaries).mockResolvedValue([]);
      const { req, res } = call(AUTH);

      await controller.listProductInventorySummaries(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('summarises the resolved business and branch', async () => {
      vi.mocked(service.listProductInventorySummaries).mockResolvedValue([]);
      const { req, res } = call(AUTH);

      await controller.listProductInventorySummaries(req, res);

      expect(service.listProductInventorySummaries).toHaveBeenCalledWith({
        businessId: 'b-1',
        branchId: 'br-1',
      });
    });

    it('lets a rejected service call propagate to the error handler', async () => {
      vi.mocked(service.listProductInventorySummaries).mockRejectedValue(new Error('db down'));
      const { req, res } = call(AUTH);

      await expect(controller.listProductInventorySummaries(req, res)).rejects.toThrow('db down');
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('getProductInventoryDetail', () => {
    it('answers 200 with the product detail the service read', async () => {
      vi.mocked(service.getProductInventoryDetail).mockResolvedValue(CREATED as never);
      const { req, res } = call(AUTH, undefined, { productId: 'p-tequila' });

      await controller.getProductInventoryDetail(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(CREATED);
    });

    it('hands the service the resolved scope and the product id from params', async () => {
      vi.mocked(service.getProductInventoryDetail).mockResolvedValue(CREATED as never);
      const { req, res } = call(AUTH, undefined, { productId: 'p-tequila' });

      await controller.getProductInventoryDetail(req, res);

      expect(service.getProductInventoryDetail).toHaveBeenCalledWith(
        { businessId: 'b-1', branchId: 'br-1' },
        'p-tequila',
      );
    });

    it('lets a rejected service call propagate to the error handler', async () => {
      vi.mocked(service.getProductInventoryDetail).mockRejectedValue(new Error('db down'));
      const { req, res } = call(AUTH, undefined, { productId: 'p-tequila' });

      await expect(controller.getProductInventoryDetail(req, res)).rejects.toThrow('db down');
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
