import { describe, it, expect, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { validateSaleCreateInput, validateSalePaymentInput } from '../sales.middleware.js';
import { ERROR_CODES } from '../../../shared/errors/app-error.js';

function call(body: unknown) {
  const req = { body, validBody: undefined } as unknown as Request;
  const res = { locals: {} } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return {
    req,
    next,
    runCreate: () => validateSaleCreateInput(req, res, next),
    runPayment: () => validateSalePaymentInput(req, res, next),
  };
}

const VALID = {
  saleDatetime: '2026-02-01T09:00:00.000Z',
  lines: [{ productId: 'p-tequila', productUnitId: 'pu-bottle', quantity: '2' }],
};

describe('sales.middleware', () => {
  describe('validateSaleCreateInput', () => {
    it('stores the parsed body on the request and calls next', () => {
      const { runCreate, req, next } = call(VALID);

      runCreate();

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
      const { runCreate, req, next } = call({ lines: [] });

      expect(runCreate).toThrow(
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

  describe('validateSalePaymentInput', () => {
    it('stores the parsed payment on the request and calls next', () => {
      const { runPayment, req, next } = call({
        status: 'PARTIALLY_PAID',
        amount: '500',
        method: 'CASH',
      });

      runPayment();

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.validBody).toEqual({ status: 'PARTIALLY_PAID', amount: 500, method: 'CASH' });
    });

    it('turns a payment with no status into a 400 and stops the chain', () => {
      const { runPayment, req, next } = call({ amount: '500' });

      expect(runPayment).toThrow(
        expect.objectContaining({
          code: ERROR_CODES.BAD_REQUEST,
          statusCode: 400,
          details: expect.objectContaining({ status: expect.any(String) }),
        }),
      );
      expect(next).not.toHaveBeenCalled();
      expect(req.validBody).toBeUndefined();
    });
  });
});
