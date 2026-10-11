import { describe, it, expect, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { validateSaleCreateInput } from '../sales.middleware.js';
import { ERROR_CODES } from '../../../shared/errors/app-error.js';

function call(body: unknown) {
  const req = { body, validBody: undefined } as unknown as Request;
  const res = { locals: {} } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { run: () => validateSaleCreateInput(req, res, next), req, next };
}

const VALID = {
  saleDatetime: '2026-02-01T09:00:00.000Z',
  lines: [{ productId: 'p-tequila', productUnitId: 'pu-bottle', quantity: '2' }],
};

describe('sales.middleware', () => {
  describe('validateSaleCreateInput', () => {
    it('stores the parsed body on the request and calls next', () => {
      const { run, req, next } = call(VALID);

      run();

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.validBody).toEqual({
        saleDatetime: new Date('2026-02-01T09:00:00.000Z'),
        lines: [{ productId: 'p-tequila', productUnitId: 'pu-bottle', quantity: 2 }],
      });
    });

    // The field-level rules themselves are covered in @mez/validation; what
    // matters here is that a failure becomes a 400 and never reaches the
    // service.
    it('turns a rejected body into a 400 and stops the chain', () => {
      const { run, req, next } = call({ lines: [] });

      expect(run).toThrow(
        expect.objectContaining({
          code: ERROR_CODES.BAD_REQUEST,
          statusCode: 400,
          message: expect.any(String),
          details: expect.objectContaining({ lines: expect.any(String) }),
        }),
      );
      expect(next).not.toHaveBeenCalled();
      expect(req.validBody).toBeUndefined();
    });
  });
});
