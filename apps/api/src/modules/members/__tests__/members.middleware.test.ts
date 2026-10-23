import { describe, it, expect, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import {
  validateMemberListFilters,
  validateMemberPerformanceQuery,
} from '../members.middleware.js';
import { ERROR_CODES } from '../../../shared/errors/app-error.js';

function call(query: Record<string, unknown>) {
  const req = { query, validQuery: undefined } as unknown as Request;
  const res = { locals: {} } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { run: () => validateMemberListFilters(req, res, next), req, next };
}

function callPerformance(query: Record<string, unknown>) {
  const req = { query, validQuery: undefined } as unknown as Request;
  const res = { locals: {} } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { run: () => validateMemberPerformanceQuery(req, res, next), req, next };
}

describe('members.middleware', () => {
  describe('validateMemberListFilters', () => {
    it('stores the parsed query on the request and calls next', () => {
      const { run, req, next } = call({ role: 'SERVER' });

      run();

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.validQuery).toEqual({ role: 'SERVER' });
    });

    it('reads an absent role as no filter', () => {
      const { run, req, next } = call({});

      run();

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.validQuery).toEqual({});
    });

    // The option set itself is covered in @mez/validation; what matters here is
    // that a bad value becomes a 400 and never reaches the service.
    it('turns an unknown role into a 400 and stops the chain', () => {
      const { run, req, next } = call({ role: 'BARTENDER' });

      expect(run).toThrow(
        expect.objectContaining({
          code: ERROR_CODES.BAD_REQUEST,
          statusCode: 400,
          message: expect.any(String),
          details: expect.objectContaining({ role: expect.any(String) }),
        }),
      );
      expect(next).not.toHaveBeenCalled();
      expect(req.validQuery).toBeUndefined();
    });
  });

  describe('validateMemberPerformanceQuery', () => {
    it('stores the parsed period on the request and calls next', () => {
      const { run, req, next } = callPerformance({
        from: '2026-09-01T00:00:00.000Z',
        to: '2026-09-30T23:59:59.000Z',
      });

      run();

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.validQuery).toEqual({
        from: new Date('2026-09-01T00:00:00.000Z'),
        to: new Date('2026-09-30T23:59:59.000Z'),
      });
    });

    it('turns a missing bound into a 400 and stops the chain', () => {
      const { run, req, next } = callPerformance({ from: '2026-09-01T00:00:00.000Z' });

      expect(run).toThrow(
        expect.objectContaining({
          code: ERROR_CODES.BAD_REQUEST,
          statusCode: 400,
          message: expect.any(String),
          details: expect.objectContaining({ to: expect.any(String) }),
        }),
      );
      expect(next).not.toHaveBeenCalled();
      expect(req.validQuery).toBeUndefined();
    });

    it('turns a backwards period into a 400 and stops the chain', () => {
      const { run, req, next } = callPerformance({
        from: '2026-09-30T00:00:00.000Z',
        to: '2026-09-01T00:00:00.000Z',
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
  });
});
