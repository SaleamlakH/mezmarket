import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUploadsService } from '../uploads.service.js';
import type { UploadRecord, UploadRepository, UploadService } from '../uploads.types.js';
import { UploadStatus } from '../../../../generated/prisma/client.js';
import type { StorageClient } from '../../../lib/storage/storage.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';

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

function uploadRecord(overrides: Record<string, unknown> = {}): UploadRecord {
  return {
    id: 'u-1',
    storageKey: 'uploads/u-1.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1024,
    status: UploadStatus.PENDING,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('uploads.service', () => {
  let repo: UploadRepository;
  let storage: StorageClient;
  let service: UploadService;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = mockRepository();
    storage = mockStorage();
    service = createUploadsService(repo, storage);
  });

  describe('createUpload', () => {
    const validInput = { record: 'PRODUCT', mimeType: 'image/jpeg', sizeBytes: 1024 } as const;

    it('creates the upload with PENDING status and a server-generated id and storage key for the record', async () => {
      vi.mocked(repo.create).mockResolvedValue(uploadRecord() as never);

      await service.createUpload(validInput);

      const input = vi.mocked(repo.create).mock.calls[0]?.[0];
      expect(input?.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
      expect(input?.storageKey).toBe(`uploads/product/${input?.id}.jpg`);
      expect(input?.mimeType).toBe('image/jpeg');
      expect(input?.sizeBytes).toBe(1024);
    });

    it('uses the .bin fallback extension when no mime type is provided', async () => {
      vi.mocked(repo.create).mockResolvedValue(uploadRecord() as never);

      await service.createUpload({ record: 'PRODUCT' });

      const input = vi.mocked(repo.create).mock.calls[0]?.[0];
      expect(input?.storageKey).toBe(`uploads/product/${input?.id}.bin`);
    });

    it('requests a presigned upload url for the stored key', async () => {
      const record = uploadRecord();
      vi.mocked(repo.create).mockResolvedValue(record as never);
      vi.mocked(storage.createUploadUrl).mockResolvedValue('https://file/signed-upload');

      await service.createUpload(validInput);

      const storageKey = vi.mocked(repo.create).mock.calls[0]?.[0].storageKey;
      expect(storage.createUploadUrl).toHaveBeenCalledWith(storageKey);
    });

    it('returns the created upload with the presigned url, including the storage key', async () => {
      const record = uploadRecord();
      vi.mocked(repo.create).mockResolvedValue(record as never);
      vi.mocked(storage.createUploadUrl).mockResolvedValue('https://file/signed-upload');

      const result = await service.createUpload(validInput);

      expect(result.uploadUrl).toBe('https://file/signed-upload');
      expect(result.upload).toEqual({
        id: 'u-1',
        storageKey: 'uploads/u-1.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        status: UploadStatus.PENDING,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      expect(result.upload).toHaveProperty('storageKey', 'uploads/u-1.jpg');
    });

    it('propagates storage failures', async () => {
      vi.mocked(repo.create).mockResolvedValue(uploadRecord() as never);
      vi.mocked(storage.createUploadUrl).mockRejectedValue(
        new AppError(ERROR_CODES.INTERNAL_ERROR, 'Failed to create presigned upload url', 500),
      );

      await expect(service.createUpload(validInput)).rejects.toEqual(
        new AppError(ERROR_CODES.INTERNAL_ERROR, 'Failed to create presigned upload url', 500),
      );
    });
  });

  describe('getUploadUrl', () => {
    it('throws BAD_REQUEST when the upload id is missing', async () => {
      await expect(service.getUploadUrl(undefined)).rejects.toEqual(
        new AppError(ERROR_CODES.BAD_REQUEST, 'Missing upload id', 400),
      );
    });

    it('throws NOT_FOUND when the upload record is missing', async () => {
      vi.mocked(repo.getById).mockResolvedValue(null);

      await expect(service.getUploadUrl('u-1')).rejects.toEqual(
        new AppError(ERROR_CODES.NOT_FOUND, 'Upload not found', 404),
      );
    });

    it('persists ACTIVE and returns a download url when the pending object exists', async () => {
      vi.mocked(repo.getById).mockResolvedValue(uploadRecord() as never);
      vi.mocked(storage.objectExists).mockResolvedValue(true);
      vi.mocked(storage.createDownloadUrl).mockResolvedValue('https://file/signed-download');

      const result = await service.getUploadUrl('u-1');

      expect(repo.getById).toHaveBeenCalledWith('u-1');
      expect(repo.setStatus).toHaveBeenCalledWith('u-1', UploadStatus.ACTIVE);
      expect(storage.createDownloadUrl).toHaveBeenCalledWith('uploads/u-1.jpg');
      expect(result).toEqual({ url: 'https://file/signed-download' });
    });

    it('persists FAILED and throws NOT_FOUND when the pending object is missing', async () => {
      vi.mocked(repo.getById).mockResolvedValue(uploadRecord() as never);
      vi.mocked(storage.objectExists).mockResolvedValue(false);

      await expect(service.getUploadUrl('u-1')).rejects.toEqual(
        new AppError(ERROR_CODES.NOT_FOUND, 'Upload not found', 404),
      );
      expect(repo.setStatus).toHaveBeenCalledWith('u-1', UploadStatus.FAILED);
      expect(storage.createDownloadUrl).not.toHaveBeenCalled();
    });

    it('returns a download url without re-checking the object when already ACTIVE', async () => {
      vi.mocked(repo.getById).mockResolvedValue(
        uploadRecord({ status: UploadStatus.ACTIVE }) as never,
      );
      vi.mocked(storage.createDownloadUrl).mockResolvedValue('https://file/signed-download');

      const result = await service.getUploadUrl('u-1');

      expect(storage.objectExists).not.toHaveBeenCalled();
      expect(repo.setStatus).not.toHaveBeenCalled();
      expect(storage.createDownloadUrl).toHaveBeenCalledWith('uploads/u-1.jpg');
      expect(result).toEqual({ url: 'https://file/signed-download' });
    });

    it('throws NOT_FOUND when the upload has already failed', async () => {
      vi.mocked(repo.getById).mockResolvedValue(
        uploadRecord({ status: UploadStatus.FAILED }) as never,
      );

      await expect(service.getUploadUrl('u-1')).rejects.toEqual(
        new AppError(ERROR_CODES.NOT_FOUND, 'Upload not found', 404),
      );
      expect(repo.setStatus).not.toHaveBeenCalled();
      expect(storage.createDownloadUrl).not.toHaveBeenCalled();
    });
  });

  describe('getUploadUrls', () => {
    it('throws BAD_REQUEST when the upload ids are missing', async () => {
      await expect(service.getUploadUrls(undefined)).rejects.toEqual(
        new AppError(ERROR_CODES.BAD_REQUEST, 'Missing upload ids', 400),
      );
    });

    it('returns an empty result when the upload ids are empty', async () => {
      const result = await service.getUploadUrls([]);

      expect(result).toEqual([]);
    });

    it('returns a matched uploadId and url for each active upload', async () => {
      vi.mocked(repo.getManyByIds).mockResolvedValue([
        uploadRecord({ id: 'u-1', storageKey: 'uploads/u-1.jpg', status: UploadStatus.ACTIVE }),
        uploadRecord({ id: 'u-2', storageKey: 'uploads/u-2.jpg', status: UploadStatus.ACTIVE }),
      ] as never);
      vi.mocked(storage.createDownloadUrl).mockImplementation(
        async (storageKey: string) => `https://file/${storageKey}`,
      );

      const result = await service.getUploadUrls(['u-1', 'u-2']);

      expect(repo.getManyByIds).toHaveBeenCalledWith(['u-1', 'u-2']);
      expect(result).toEqual([
        { uploadId: 'u-1', url: 'https://file/uploads/u-1.jpg' },
        { uploadId: 'u-2', url: 'https://file/uploads/u-2.jpg' },
      ]);
      expect(storage.objectExists).not.toHaveBeenCalled();
    });

    it('reconciles pending uploads to ACTIVE when the objects exist', async () => {
      vi.mocked(repo.getManyByIds).mockResolvedValue([uploadRecord()] as never);
      vi.mocked(storage.objectExists).mockResolvedValue(true);
      vi.mocked(storage.createDownloadUrl).mockResolvedValue('https://file/signed-download');

      const result = await service.getUploadUrls(['u-1']);

      expect(repo.setStatus).toHaveBeenCalledWith('u-1', UploadStatus.ACTIVE);
      expect(result).toEqual([{ uploadId: 'u-1', url: 'https://file/signed-download' }]);
    });

    it('skips uploads whose record is missing', async () => {
      vi.mocked(repo.getManyByIds).mockResolvedValue([]);

      const result = await service.getUploadUrls(['u-1']);

      expect(result).toEqual([]);
      expect(storage.createDownloadUrl).not.toHaveBeenCalled();
    });

    it('skips uploads that already failed', async () => {
      vi.mocked(repo.getManyByIds).mockResolvedValue([
        uploadRecord({ status: UploadStatus.FAILED }),
      ] as never);

      const result = await service.getUploadUrls(['u-1']);

      expect(result).toEqual([]);
      expect(repo.setStatus).not.toHaveBeenCalled();
      expect(storage.createDownloadUrl).not.toHaveBeenCalled();
    });

    it('skips uploads whose pending object is missing and marks them FAILED', async () => {
      vi.mocked(repo.getManyByIds).mockResolvedValue([uploadRecord()] as never);
      vi.mocked(storage.objectExists).mockResolvedValue(false);

      const result = await service.getUploadUrls(['u-1']);

      expect(repo.setStatus).toHaveBeenCalledWith('u-1', UploadStatus.FAILED);
      expect(result).toEqual([]);
      expect(storage.createDownloadUrl).not.toHaveBeenCalled();
    });

    it('returns only the successfully issued entries, preserving input order', async () => {
      vi.mocked(repo.getManyByIds).mockResolvedValue([
        uploadRecord({ id: 'u-1', storageKey: 'uploads/u-1.jpg', status: UploadStatus.ACTIVE }),
        uploadRecord({ id: 'u-3', storageKey: 'uploads/u-3.jpg', status: UploadStatus.ACTIVE }),
      ] as never);
      vi.mocked(storage.createDownloadUrl).mockImplementation(
        async (storageKey: string) => `https://file/${storageKey}`,
      );

      const result = await service.getUploadUrls(['u-1', 'u-2', 'u-3']);

      expect(result).toEqual([
        { uploadId: 'u-1', url: 'https://file/uploads/u-1.jpg' },
        { uploadId: 'u-3', url: 'https://file/uploads/u-3.jpg' },
      ]);
    });
  });
});
