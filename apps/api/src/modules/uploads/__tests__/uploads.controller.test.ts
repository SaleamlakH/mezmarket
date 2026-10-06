import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { createUploadsController } from '../uploads.controller.js';
import { UploadStatus } from '../../../../generated/prisma/client.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';
import type { UploadService } from '../uploads.types.js';

function mockService(): UploadService {
  return {
    createUpload: vi.fn(),
    getUploadUrl: vi.fn(),
    getUploadUrls: vi.fn(),
  };
}

function mockRes() {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    body: {},
    ...overrides,
  } as unknown as Request;
}

describe('uploads.controller', () => {
  let service: UploadService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = mockService();
  });

  describe('createUpload', () => {
    it('returns 201 with the upload and its presigned url', async () => {
      const controller = createUploadsController(service);
      const result = {
        upload: { id: 'u-1', mimeType: 'image/jpeg', status: UploadStatus.PENDING },
        uploadUrl: 'https://file/signed-upload',
      };
      vi.mocked(service.createUpload).mockResolvedValue(result as never);
      const res = mockRes();

      await controller.createUpload(
        mockReq({ validBody: { record: 'PRODUCT', mimeType: 'image/jpeg', sizeBytes: 1024 } }),
        res,
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(result);
    });

    it('passes the validated payload to the service', async () => {
      const controller = createUploadsController(service);
      const validBody = { record: 'PRODUCT', mimeType: 'image/jpeg', sizeBytes: 1024 };
      vi.mocked(service.createUpload).mockResolvedValue({} as never);

      await controller.createUpload(mockReq({ validBody }), mockRes());

      expect(service.createUpload).toHaveBeenCalledWith(validBody);
    });

    it('propagates service errors', async () => {
      const controller = createUploadsController(service);
      vi.mocked(service.createUpload).mockRejectedValue(
        new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400),
      );

      await expect(
        controller.createUpload(
          mockReq({ validBody: { record: 'PRODUCT', mimeType: 'application/pdf' } }),
          mockRes(),
        ),
      ).rejects.toThrow(new AppError(ERROR_CODES.BAD_REQUEST, 'Invalid request', 400));
    });
  });

  describe('getUploadUrl', () => {
    it('returns 200 with the download url', async () => {
      const controller = createUploadsController(service);
      vi.mocked(service.getUploadUrl).mockResolvedValue({ url: 'https://file/signed-download' });
      const res = mockRes();

      await controller.getUploadUrl(mockReq({ params: { uploadId: 'u-1' } }), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ url: 'https://file/signed-download' });
    });

    it('passes the upload id from params', async () => {
      const controller = createUploadsController(service);
      vi.mocked(service.getUploadUrl).mockResolvedValue({ url: 'https://file/signed-download' });

      await controller.getUploadUrl(mockReq({ params: { uploadId: 'u-1' } }), mockRes());

      expect(service.getUploadUrl).toHaveBeenCalledWith('u-1');
    });

    it('propagates service errors', async () => {
      const controller = createUploadsController(service);
      vi.mocked(service.getUploadUrl).mockRejectedValue(
        new AppError(ERROR_CODES.NOT_FOUND, 'Upload not found', 404),
      );

      await expect(
        controller.getUploadUrl(mockReq({ params: { uploadId: 'u-1' } }), mockRes()),
      ).rejects.toThrow(new AppError(ERROR_CODES.NOT_FOUND, 'Upload not found', 404));
    });
  });

  describe('getUploadUrls', () => {
    it('returns 200 with the matched download urls', async () => {
      const controller = createUploadsController(service);
      vi.mocked(service.getUploadUrls).mockResolvedValue([
        { uploadId: 'u-1', url: 'https://file/signed-download' },
      ]);
      const res = mockRes();

      await controller.getUploadUrls(mockReq({ uploadIds: ['u-1'], body: {} }), res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        { uploadId: 'u-1', url: 'https://file/signed-download' },
      ]);
    });

    it('passes the upload ids resolved on the request', async () => {
      const controller = createUploadsController(service);
      vi.mocked(service.getUploadUrls).mockResolvedValue([]);

      await controller.getUploadUrls(mockReq({ uploadIds: ['u-1', 'u-2'] }), mockRes());

      expect(service.getUploadUrls).toHaveBeenCalledWith(['u-1', 'u-2']);
    });

    it('propagates service errors', async () => {
      const controller = createUploadsController(service);
      vi.mocked(service.getUploadUrls).mockRejectedValue(
        new AppError(ERROR_CODES.BAD_REQUEST, 'Missing upload ids', 400),
      );

      await expect(controller.getUploadUrls(mockReq({}), mockRes())).rejects.toThrow(
        new AppError(ERROR_CODES.BAD_REQUEST, 'Missing upload ids', 400),
      );
    });
  });
});
