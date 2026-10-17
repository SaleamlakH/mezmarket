import { describe, it, expect, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { validateCustomerInput } from '../customers.middleware.js';
import { ERROR_CODES } from '../../../shared/errors/app-error.js';

function call(body: unknown) {
  const req = { body, validBody: undefined } as unknown as Request;
  const res = { locals: {} } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { run: () => validateCustomerInput(req, res, next), req, next };
}

describe('customers.middleware', () => {
  describe('validateCustomerInput', () => {
    it('stores the parsed body on the request and calls next', () => {
      const { run, req, next } = call({ name: 'Abebe', contactPhone: '0911' });

      run();

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.validBody).toEqual({ name: 'Abebe', contactPhone: '0911' });
    });

    // The field-level rules themselves are covered in @mez/validation; what
    // matters here is that a failure becomes a 400 and never reaches the service.
    it('turns a rejected body into a 400 and stops the chain', () => {
      const { run, req, next } = call({ name: '' });

      expect(run).toThrow(
        expect.objectContaining({
          code: ERROR_CODES.BAD_REQUEST,
          statusCode: 400,
          message: expect.any(String),
          details: expect.objectContaining({ name: expect.any(String) }),
        }),
      );
      expect(next).not.toHaveBeenCalled();
      expect(req.validBody).toBeUndefined();
    });
  });
});
