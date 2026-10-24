import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import type { DashboardService } from '../dashboard.types.js';
import { createDashboardController } from '../dashboard.controller.js';

const AUTH = {
  ownerId: 'owner-1',
  businessId: 'b-1',
  branchId: 'br-1',
  memberId: 'm-1',
  role: 'MANAGER',
} as const;

const FROM = new Date('2026-06-01T00:00:00.000Z');
const TO = new Date('2026-06-02T00:00:00.000Z');

function mockService(): DashboardService {
  return {
    getAttention: vi.fn(),
    getSummary: vi.fn(),
    getTrend: vi.fn(),
  };
}

describe('dashboard.controller', () => {
  let service: DashboardService;
  let controller: ReturnType<typeof createDashboardController>;

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockService();
    controller = createDashboardController(service);
  });

  function call(auth: Partial<Request['auth']> | undefined, validQuery?: unknown) {
    const req = { auth, validQuery } as unknown as Request;
    const res = {
      locals: {},
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    return { req, res };
  }

  describe('getAttention', () => {
    it('answers 200 with the attention the service read', async () => {
      const attention = { asOf: '2026-06-15T12:00:00.000Z' };
      vi.mocked(service.getAttention).mockResolvedValue(attention as never);
      const { req, res } = call(AUTH);

      await controller.getAttention(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(attention);
    });

    it('hands the service the resolved scope and role', async () => {
      vi.mocked(service.getAttention).mockResolvedValue({} as never);
      const { req, res } = call(AUTH);

      await controller.getAttention(req, res);

      expect(service.getAttention).toHaveBeenCalledWith({
        businessId: 'b-1',
        branchId: 'br-1',
        memberId: 'm-1',
        role: 'MANAGER',
      });
    });
  });

  describe('getSummary', () => {
    it('answers 200 with the summary for the validated period', async () => {
      const summary = { asOf: '2026-06-15T12:00:00.000Z' };
      vi.mocked(service.getSummary).mockResolvedValue(summary as never);
      const { req, res } = call(AUTH, { from: FROM, to: TO });

      await controller.getSummary(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(summary);
      expect(service.getSummary).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'MANAGER' }),
        {
          from: FROM,
          to: TO,
        },
      );
    });
  });

  describe('getTrend', () => {
    it('answers 200 with the trend for the validated filters', async () => {
      const trend = { bucket: 'hour', points: [] };
      vi.mocked(service.getTrend).mockResolvedValue(trend as never);
      const { req, res } = call(AUTH, { from: FROM, to: TO, bucket: 'hour' });

      await controller.getTrend(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(trend);
      expect(service.getTrend).toHaveBeenCalledWith(expect.objectContaining({ role: 'MANAGER' }), {
        from: FROM,
        to: TO,
        bucket: 'hour',
      });
    });
  });

  it('lets a rejected service call propagate to the error handler', async () => {
    vi.mocked(service.getAttention).mockRejectedValue(new Error('db down'));
    const { req, res } = call(AUTH);

    await expect(controller.getAttention(req, res)).rejects.toThrow('db down');
    expect(res.json).not.toHaveBeenCalled();
  });
});
