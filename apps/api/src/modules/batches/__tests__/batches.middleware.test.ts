import { describe, it, expect, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import {
  validateBatchCreateInput,
  validateInventoryDetailFilters,
  validateInventoryListFilters,
} from '../batches.middleware.js';
import { ERROR_CODES } from '../../../shared/errors/app-error.js';

function call(body: unknown, query: Record<string, unknown> = {}) {
  const req = { body, query, validBody: undefined, validQuery: undefined } as unknown as Request;
  const res = { locals: {} } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { run: () => validateBatchCreateInput(req, res, next), req, next };
}

const VALID = {
  batchDate: '2026-02-01T09:00:00.000Z',
  supplierName: 'Awash Mart',
  lines: [
    {
      productId: 'p-tequila',
      productUnitId: 'pu-bottle',
      purchaseQuantity: '10',
      purchaseUnitCost: '950',
    },
  ],
};

describe('batches.middleware', () => {
  describe('validateBatchCreateInput', () => {
    it('stores the parsed body on the request and calls next', () => {
      const { run, req, next } = call(VALID);

      run();

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.validBody).toEqual({
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
      });
    });

    // The field-level rules themselves are covered in @mez/validation; what
    // matters here is that a failure becomes a 400 and never reaches the
    // service.
    it('turns a rejected body into a 400 and stops the chain', () => {
      const { run, req, next } = call({ batchDate: '', lines: [] });

      expect(run).toThrow(
        expect.objectContaining({
          code: ERROR_CODES.BAD_REQUEST,
          statusCode: 400,
          message: expect.any(String),
          details: expect.objectContaining({
            batchDate: expect.any(String),
            lines: expect.any(String),
          }),
        }),
      );
      expect(next).not.toHaveBeenCalled();
      expect(req.validBody).toBeUndefined();
    });
  });

  describe('validateInventoryListFilters', () => {
    function queryCall(query: Record<string, unknown>) {
      const req = { query, validQuery: undefined } as unknown as Request;
      const res = { locals: {} } as unknown as Response;
      const next = vi.fn() as NextFunction;
      return { run: () => validateInventoryListFilters(req, res, next), req, next };
    }

    it('parses the expiry cutoff onto the request', () => {
      const { run, req, next } = queryCall({ expiryBefore: '2026-10-24T00:00:00.000Z' });

      run();

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.validQuery).toEqual({ expiryBefore: new Date('2026-10-24T00:00:00.000Z') });
    });

    it('turns a malformed cutoff into a 400 and stops the chain', () => {
      const { run, req, next } = queryCall({ expiryBefore: 'soon' });

      expect(run).toThrow(
        expect.objectContaining({
          code: ERROR_CODES.BAD_REQUEST,
          statusCode: 400,
          details: expect.objectContaining({ expiryBefore: expect.any(String) }),
        }),
      );
      expect(next).not.toHaveBeenCalled();
      expect(req.validQuery).toBeUndefined();
    });
  });

  describe('validateInventoryDetailFilters', () => {
    function queryCall(query: Record<string, unknown>) {
      const req = { query, validQuery: undefined } as unknown as Request;
      const res = { locals: {} } as unknown as Response;
      const next = vi.fn() as NextFunction;
      return { run: () => validateInventoryDetailFilters(req, res, next), req, next };
    }

    it('parses the expiry cutoff onto the request', () => {
      const { run, req, next } = queryCall({ expiryBefore: '2026-10-24T00:00:00.000Z' });

      run();

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.validQuery).toEqual({ expiryBefore: new Date('2026-10-24T00:00:00.000Z') });
    });

    it('turns a malformed cutoff into a 400 and stops the chain', () => {
      const { run, req, next } = queryCall({ expiryBefore: 'soon' });

      expect(run).toThrow(
        expect.objectContaining({
          code: ERROR_CODES.BAD_REQUEST,
          statusCode: 400,
          details: expect.objectContaining({ expiryBefore: expect.any(String) }),
        }),
      );
      expect(next).not.toHaveBeenCalled();
      expect(req.validQuery).toBeUndefined();
    });
  });
});
