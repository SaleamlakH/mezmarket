import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateOwnerUpdate } from '../owner.middleware.js';
import { ERROR_CODES } from '../../../shared/errors/app-error.js';
import type { Request, Response, NextFunction } from 'express';

function call(body: unknown) {
  const req = { body } as unknown as Request;
  const res = {} as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { run: () => validateOwnerUpdate(req, res, next), req, res, next };
}

describe('owner.middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateOwnerUpdate', () => {
    it('should call next and store validated data on req.validBody', () => {
      const { run, req, next } = call({ name: 'John' });

      run();

      expect(next).toHaveBeenCalledOnce();
      expect(req.validBody).toEqual({ name: 'John' });
    });

    it('should throw AppError with details on validation failure', () => {
      const { run, next } = call({ name: '' });

      expect(() => run()).toThrow(
        expect.objectContaining({
          name: 'AppError',
          code: ERROR_CODES.BAD_REQUEST,
          statusCode: 400,
          message: expect.any(String),
          details: { name: expect.any(String) },
        }),
      );

      expect(next).not.toHaveBeenCalled();
    });
  });
});
