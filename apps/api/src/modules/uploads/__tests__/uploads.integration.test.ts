import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { createUploadsService } from '../uploads.service.js';
import { createUploadsController } from '../uploads.controller.js';
import { createUploadsRouter } from '../uploads.routes.js';
import { validateUploadInput } from '../uploads.middleware.js';
import type { UploadRecord, UploadRepository } from '../uploads.types.js';
import type { StorageClient } from '../../../lib/storage/storage.js';
import { UploadStatus } from '../../../../generated/prisma/client.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import { errorHandler } from '../../../shared/errors/error-handler.js';

const ISO = '2026-01-01T00:00:00.000Z';

type ResolveUploads = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function mockRepository(): UploadRepository {
  return {
    create: vi.fn(),
    getById: vi.fn(),
    getManyByIds: vi.fn(),
    setStatus: vi.fn(),
  };
}

function mockStorage(): StorageClient {
  return {
    createUploadUrl: vi.fn(),
    objectExists: vi.fn(),
    createDownloadUrl: vi.fn(),
  };
}

function uploadRecord(overrides: Partial<UploadRecord> = {}): UploadRecord {
  return {
    id: 'u-1',
    storageKey: 'uploads/product/u-1.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1024,
    status: UploadStatus.PENDING,
    createdAt: new Date(ISO),
    updatedAt: new Date(ISO),
    ...overrides,
  };
}

function buildApp(resolveUploads: ResolveUploads = async (_req, _res, next) => next()) {
  const repo = mockRepository();
  const storage = mockStorage();

  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.auth = { ownerId: 'owner-1', businessId: 'b-1', branchId: 'br-1' };
    next();
  });
  app.use(
    '/api',
    createUploadsRouter(
      createUploadsController(createUploadsService(repo, storage)),
      validateUploadInput,
      resolveUploads,
    ),
  );
  app.use(errorHandler);

  return { app, repo, storage };
}

describe('uploads.integration', () => {
  describe('POST /api/uploads', () => {
    it('creates an upload and returns the presigned upload url including the storage key', async () => {
      const { app, repo, storage } = buildApp();
      vi.mocked(repo.create).mockResolvedValue(uploadRecord() as never);
      vi.mocked(storage.createUploadUrl).mockResolvedValue('https://file/signed-upload');

      const res = await request(app)
        .post('/api/uploads')
        .send({ record: 'PRODUCT', mimeType: 'image/jpeg', sizeBytes: 1024 });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        upload: {
          id: 'u-1',
          storageKey: 'uploads/product/u-1.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1024,
          status: UploadStatus.PENDING,
          createdAt: ISO,
          updatedAt: ISO,
        },
        uploadUrl: 'https://file/signed-upload',
      });
      expect(res.body.upload).toHaveProperty('storageKey', 'uploads/product/u-1.jpg');

      const input = vi.mocked(repo.create).mock.calls[0]?.[0];
      expect(input?.storageKey).toBe(`uploads/product/${input?.id}.jpg`);
      expect(storage.createUploadUrl).toHaveBeenCalledWith(input?.storageKey);
    });

    it('returns 400 with field details when the payload is invalid', async () => {
      const { app, repo } = buildApp();

      const res = await request(app)
        .post('/api/uploads')
        .send({ record: 'PRODUCT', mimeType: 'application/pdf', sizeBytes: 1024 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        error: {
          code: ERROR_CODES.BAD_REQUEST,
          message: 'Invalid request',
          details: { mimeType: expect.any(String) },
        },
      });
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('returns 500 when signing the upload url fails', async () => {
      const { app, repo, storage } = buildApp();
      vi.mocked(repo.create).mockResolvedValue(uploadRecord() as never);
      vi.mocked(storage.createUploadUrl).mockRejectedValue(
        new AppError(ERROR_CODES.INTERNAL_ERROR, 'Failed to create presigned upload url', 500),
      );

      const res = await request(app)
        .post('/api/uploads')
        .send({ record: 'PRODUCT', mimeType: 'image/jpeg', sizeBytes: 1024 });

      expect(res.status).toBe(500);
      expect(res.body).toMatchObject({
        error: { code: ERROR_CODES.INTERNAL_ERROR, message: expect.any(String) },
      });
    });
  });

  describe('GET /api/uploads/urls', () => {
    it('resolves the provided upload ids and returns matched urls', async () => {
      const { app, repo, storage } = buildApp(async (req, _res, next) => {
        req.uploadIds = ['u-1', 'u-2'];
        next();
      });
      vi.mocked(repo.getManyByIds).mockImplementation(async (ids: string[]) =>
        ids.map(
          (id) =>
            uploadRecord({
              id,
              storageKey: `uploads/product/${id}.jpg`,
              status: UploadStatus.ACTIVE,
            }) as never,
        ),
      );
      vi.mocked(storage.createDownloadUrl).mockImplementation(
        async (storageKey: string) => `https://file/${storageKey}`,
      );

      const res = await request(app).get('/api/uploads/urls');

      expect(res.status).toBe(200);
      expect(repo.getManyByIds).toHaveBeenCalledWith(['u-1', 'u-2']);
      expect(res.body).toEqual([
        { uploadId: 'u-1', url: 'https://file/uploads/product/u-1.jpg' },
        { uploadId: 'u-2', url: 'https://file/uploads/product/u-2.jpg' },
      ]);
    });

    it('returns an empty batch when no upload ids are resolved', async () => {
      const { app, repo, storage } = buildApp(async (req, _res, next) => {
        req.uploadIds = [];
        next();
      });

      const res = await request(app).get('/api/uploads/urls');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
      expect(repo.getManyByIds).not.toHaveBeenCalled();
      expect(storage.createDownloadUrl).not.toHaveBeenCalled();
    });

    it('skips uploads that already failed', async () => {
      const { app, repo, storage } = buildApp(async (req, _res, next) => {
        req.uploadIds = ['u-1'];
        next();
      });
      vi.mocked(repo.getManyByIds).mockResolvedValue([
        uploadRecord({ status: UploadStatus.FAILED }),
      ] as never);

      const res = await request(app).get('/api/uploads/urls');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
      expect(repo.setStatus).not.toHaveBeenCalled();
      expect(storage.createDownloadUrl).not.toHaveBeenCalled();
    });

    it('skips uploads whose pending object is missing and marks them FAILED', async () => {
      const { app, repo, storage } = buildApp(async (req, _res, next) => {
        req.uploadIds = ['u-1'];
        next();
      });
      vi.mocked(repo.getManyByIds).mockResolvedValue([uploadRecord()] as never);
      vi.mocked(storage.objectExists).mockResolvedValue(false);

      const res = await request(app).get('/api/uploads/urls');

      expect(res.status).toBe(200);
      expect(repo.setStatus).toHaveBeenCalledWith('u-1', UploadStatus.FAILED);
      expect(res.body).toEqual([]);
      expect(storage.createDownloadUrl).not.toHaveBeenCalled();
    });

    it('returns 400 when the upload ids are missing on the request', async () => {
      const app = buildApp().app;

      const res = await request(app).get('/api/uploads/urls');

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        error: { code: ERROR_CODES.BAD_REQUEST, message: expect.any(String) },
      });
    });
  });

  describe('GET /api/:recordId/uploads/:uploadId/url', () => {
    it('resolves the upload id from the route params and returns the download url', async () => {
      const { app, repo, storage } = buildApp();
      vi.mocked(repo.getById).mockResolvedValue(
        uploadRecord({ status: UploadStatus.ACTIVE }) as never,
      );
      vi.mocked(storage.createDownloadUrl).mockResolvedValue('https://file/signed-download');

      const res = await request(app).get('/api/p-1/uploads/u-1/url');

      expect(res.status).toBe(200);
      expect(repo.getById).toHaveBeenCalledWith('u-1');
      expect(res.body).toEqual({ url: 'https://file/signed-download' });
    });

    it('reconciles a pending upload to ACTIVE when the object exists', async () => {
      const { app, repo, storage } = buildApp();
      vi.mocked(repo.getById).mockResolvedValue(uploadRecord() as never);
      vi.mocked(storage.objectExists).mockResolvedValue(true);
      vi.mocked(storage.createDownloadUrl).mockResolvedValue('https://file/signed-download');

      const res = await request(app).get('/api/p-1/uploads/u-1/url');

      expect(res.status).toBe(200);
      expect(repo.setStatus).toHaveBeenCalledWith('u-1', UploadStatus.ACTIVE);
      expect(res.body).toEqual({ url: 'https://file/signed-download' });
    });

    it('marks a pending upload FAILED and returns 404 when the object is missing', async () => {
      const { app, repo, storage } = buildApp();
      vi.mocked(repo.getById).mockResolvedValue(uploadRecord() as never);
      vi.mocked(storage.objectExists).mockResolvedValue(false);

      const res = await request(app).get('/api/p-1/uploads/u-1/url');

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        error: { code: ERROR_CODES.NOT_FOUND, message: expect.any(String) },
      });
      expect(repo.setStatus).toHaveBeenCalledWith('u-1', UploadStatus.FAILED);
      expect(storage.createDownloadUrl).not.toHaveBeenCalled();
    });

    it('returns 404 when the upload record is missing', async () => {
      const { app, repo, storage } = buildApp();
      vi.mocked(repo.getById).mockResolvedValue(null);

      const res = await request(app).get('/api/p-1/uploads/u-1/url');

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        error: { code: ERROR_CODES.NOT_FOUND, message: expect.any(String) },
      });
      expect(storage.objectExists).not.toHaveBeenCalled();
      expect(storage.createDownloadUrl).not.toHaveBeenCalled();
    });
  });
});
