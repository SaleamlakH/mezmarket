import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { errorHandler } from '../error-handler.js';
import { AppError } from '../app-error.js';
import { ERROR_CODES } from '../app-error.js';

function createApp(err: unknown) {
  const app = express();
  app.use((_req, _res, next) => {
    if (err === undefined) {
      next();
    } else {
      throw err;
    }
  });

  app.use(errorHandler);
  return app;
}

describe('error-handler', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  it('responds with AppError status and shape', async () => {
    const app = createApp(new AppError(ERROR_CODES.UNAUTHORIZED, 'Invalid token', 401));

    const res = await request(app).get('/ok');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Invalid token' },
    });
  });

  it('includes details when the AppError carries them', async () => {
    const app = createApp(
      new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400, {
        name: 'Business name is required',
      }),
    );

    const res = await request(app).get('/ok');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid request',
        details: { name: 'Business name is required' },
      },
    });
  });

  it('responds 500 for unknown errors', async () => {
    const app = createApp(new Error('boom'));

    const res = await request(app).get('/ok');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
