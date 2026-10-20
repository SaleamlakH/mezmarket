import { describe, it, expect, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { validateUploadInput } from '../uploads.middleware.js';
import { ERROR_CODES } from '../../../shared/errors/app-error.js';

function thrownBy(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }

  throw new Error('Expected the function to throw');
}

function call(body: unknown) {
  const req = { body } as unknown as Request;
  const res = {} as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { run: () => validateUploadInput(req, res, next), req, next };
}

describe('validateUploadInput', () => {
  it('passes through and stores the validated payload on req.validBody', () => {
    const { run, req, next } = call({
      record: 'PRODUCT',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
    });

    run();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.validBody).toEqual({ record: 'PRODUCT', mimeType: 'image/jpeg', sizeBytes: 1024 });
  });

  it('rejects an unsupported mime type with field details', () => {
    const { run, next } = call({ record: 'PRODUCT', mimeType: 'application/pdf' });

    expect(thrownBy(run)).toMatchObject({
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: 400,
      message: expect.any(String),
      details: { mimeType: expect.any(String) },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a payload missing the record type', () => {
    const { run, next } = call({ mimeType: 'image/jpeg', sizeBytes: 1024 });

    expect(thrownBy(run)).toMatchObject({
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: 400,
      message: expect.any(String),
      details: { record: expect.any(String) },
    });
    expect(next).not.toHaveBeenCalled();
  });
});
