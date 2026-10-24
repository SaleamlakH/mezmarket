import { describe, it, expect, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { validatePaymentSummaryQuery } from '../payments.middleware.js';
import { ERROR_CODES } from '../../../shared/errors/app-error.js';

const FROM = '2026-02-01T00:00:00.000Z';
const TO = '2026-02-02T00:00:00.000Z';

function call(query: unknown) {
  const req = { query, validQuery: undefined } as unknown as Request;
  const res = { locals: {} } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, next, run: () => validatePaymentSummaryQuery(req, res, next) };
}

describe('payments.middleware', () => {
  it('stores the parsed period on the request and calls next', () => {
    const { run, req, next } = call({ from: FROM, to: TO });

    run();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.validQuery).toEqual({
      from: new Date(FROM),
      to: new Date(TO),
      groupBy: 'method',
    });
  });

  it('keeps an explicit method grouping', () => {
    const { run, req, next } = call({ from: FROM, to: TO, groupBy: 'method' });

    run();

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.validQuery).toEqual({
      from: new Date(FROM),
      to: new Date(TO),
      groupBy: 'method',
    });
  });

  it('rejects a missing period bound with a 400 and stops the chain', () => {
    const { run, req, next } = call({ to: TO });

    expect(run).toThrow(
      expect.objectContaining({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: 400,
        message: expect.any(String),
        details: expect.objectContaining({ from: expect.any(String) }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
    expect(req.validQuery).toBeUndefined();
  });

  it('rejects an inverted period with a 400 and stops the chain', () => {
    const { run, req, next } = call({ from: TO, to: FROM });

    expect(run).toThrow(
      expect.objectContaining({
        code: ERROR_CODES.BAD_REQUEST,
        statusCode: 400,
        details: expect.objectContaining({ from: expect.any(String) }),
      }),
    );
    expect(next).not.toHaveBeenCalled();
    expect(req.validQuery).toBeUndefined();
  });
});
