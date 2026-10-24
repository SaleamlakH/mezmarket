import { describe, it, expect, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { ERROR_CODES } from '../../../shared/errors/app-error.js';
import {
  validateDashboardSummaryQuery,
  validateDashboardTrendQuery,
} from '../dashboard.middleware.js';

function call(
  middleware: (req: Request, res: Response, next: NextFunction) => void,
  query: Record<string, unknown>,
) {
  const req = { query, validQuery: undefined } as unknown as Request;
  const res = { locals: {} } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { run: () => middleware(req, res, next), req, next };
}

describe('dashboard.middleware', () => {
  describe('validateDashboardSummaryQuery', () => {
    it('stores parsed period instants on the request', () => {
      const { run, req, next } = call(validateDashboardSummaryQuery, {
        from: '2026-06-01T00:00:00.000Z',
        to: '2026-06-02T00:00:00.000Z',
      });

      run();

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.validQuery).toEqual({
        from: new Date('2026-06-01T00:00:00.000Z'),
        to: new Date('2026-06-02T00:00:00.000Z'),
      });
    });

    it('rejects a period that does not run forward', () => {
      const { run, req, next } = call(validateDashboardSummaryQuery, {
        from: '2026-06-02T00:00:00.000Z',
        to: '2026-06-01T00:00:00.000Z',
      });

      expect(run).toThrow(
        expect.objectContaining({
          code: ERROR_CODES.BAD_REQUEST,
          statusCode: 400,
          message: expect.any(String),
        }),
      );
      expect(next).not.toHaveBeenCalled();
      expect(req.validQuery).toBeUndefined();
    });

    it('rejects a period wider than a year', () => {
      const { run } = call(validateDashboardSummaryQuery, {
        from: '2025-01-01T00:00:00.000Z',
        to: '2026-06-01T00:00:00.000Z',
      });

      expect(run).toThrow(
        expect.objectContaining({ code: ERROR_CODES.BAD_REQUEST, statusCode: 400 }),
      );
    });

    it('rejects a missing instant', () => {
      const { run } = call(validateDashboardSummaryQuery, {});

      expect(run).toThrow(
        expect.objectContaining({ code: ERROR_CODES.BAD_REQUEST, statusCode: 400 }),
      );
    });
  });

  describe('validateDashboardTrendQuery', () => {
    it('defaults a short span to hourly buckets', () => {
      const { run, req, next } = call(validateDashboardTrendQuery, {
        from: '2026-06-01T00:00:00.000Z',
        to: '2026-06-01T12:00:00.000Z',
      });

      run();

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.validQuery).toEqual({
        from: new Date('2026-06-01T00:00:00.000Z'),
        to: new Date('2026-06-01T12:00:00.000Z'),
        bucket: 'hour',
      });
    });

    it('defaults a long span to daily buckets', () => {
      const { run, req } = call(validateDashboardTrendQuery, {
        from: '2026-06-01T00:00:00.000Z',
        to: '2026-06-05T00:00:00.000Z',
      });

      run();

      expect(req.validQuery).toEqual(expect.objectContaining({ bucket: 'day' }));
    });

    it('refuses an hourly bucket above 48 hours', () => {
      const { run } = call(validateDashboardTrendQuery, {
        from: '2026-06-01T00:00:00.000Z',
        to: '2026-06-05T00:00:00.000Z',
        bucket: 'hour',
      });

      expect(run).toThrow(
        expect.objectContaining({ code: ERROR_CODES.BAD_REQUEST, statusCode: 400 }),
      );
    });

    it('refuses an unknown bucket', () => {
      const { run } = call(validateDashboardTrendQuery, {
        from: '2026-06-01T00:00:00.000Z',
        to: '2026-06-02T00:00:00.000Z',
        bucket: 'week',
      });

      expect(run).toThrow(
        expect.objectContaining({ code: ERROR_CODES.BAD_REQUEST, statusCode: 400 }),
      );
    });
  });
});
