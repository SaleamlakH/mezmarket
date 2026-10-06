import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUploadsRepository } from '../uploads.repository.js';
import type { UploadRecord, UploadRepository } from '../uploads.types.js';
import { UploadStatus } from '../../../../generated/prisma/client.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';

type UploadStub = {
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
};

function createPrismaStub() {
  const upload: UploadStub = {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn().mockResolvedValue([]),
  };
  const prisma = { upload } as unknown as PrismaClient;

  return { prisma, upload };
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

describe('uploads.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an object implementing UploadRepository', () => {
    const { prisma } = createPrismaStub();
    const repo = createUploadsRepository(prisma) satisfies UploadRepository;

    expect(typeof repo.create).toBe('function');
    expect(typeof repo.getById).toBe('function');
    expect(typeof repo.getManyByIds).toBe('function');
    expect(typeof repo.setStatus).toBe('function');
  });

  describe('create', () => {
    it('creates the upload with PENDING status and the given metadata', async () => {
      const { prisma, upload } = createPrismaStub();
      const repo = createUploadsRepository(prisma);
      upload.create.mockResolvedValue(uploadRecord());

      await repo.create({
        id: 'u-1',
        storageKey: 'uploads/u-1.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
      });

      expect(upload.create).toHaveBeenCalledWith({
        data: {
          id: 'u-1',
          storageKey: 'uploads/u-1.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 1024,
          status: UploadStatus.PENDING,
        },
      });
    });

    it('allows null mime and size metadata', async () => {
      const { prisma, upload } = createPrismaStub();
      const repo = createUploadsRepository(prisma);
      upload.create.mockResolvedValue(uploadRecord({ mimeType: null, sizeBytes: null }));

      await repo.create({
        id: 'u-2',
        storageKey: 'uploads/u-2.bin',
        mimeType: null,
        sizeBytes: null,
      });

      expect(upload.create).toHaveBeenCalledWith({
        data: {
          id: 'u-2',
          storageKey: 'uploads/u-2.bin',
          mimeType: null,
          sizeBytes: null,
          status: UploadStatus.PENDING,
        },
      });
    });

    it('returns the created upload record', async () => {
      const { prisma, upload } = createPrismaStub();
      const repo = createUploadsRepository(prisma);
      const record = uploadRecord();
      upload.create.mockResolvedValue(record);

      const result = await repo.create({
        id: 'u-1',
        storageKey: 'uploads/u-1.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
      });

      expect(result).toEqual(record);
    });
  });

  describe('getById', () => {
    it('queries the upload by id', async () => {
      const { prisma, upload } = createPrismaStub();
      const repo = createUploadsRepository(prisma);
      upload.findUnique.mockResolvedValue(null);

      await repo.getById('u-1');

      expect(upload.findUnique).toHaveBeenCalledWith({ where: { id: 'u-1' } });
    });

    it('returns null when the upload is missing', async () => {
      const { prisma, upload } = createPrismaStub();
      const repo = createUploadsRepository(prisma);
      upload.findUnique.mockResolvedValue(null);

      await expect(repo.getById('u-1')).resolves.toBeNull();
    });

    it('returns the upload record when found', async () => {
      const { prisma, upload } = createPrismaStub();
      const repo = createUploadsRepository(prisma);
      const record = uploadRecord();
      upload.findUnique.mockResolvedValue(record);

      const result = await repo.getById('u-1');

      expect(result).toEqual(record);
    });
  });

  describe('getManyByIds', () => {
    it('queries the uploads by ids', async () => {
      const { prisma, upload } = createPrismaStub();
      const repo = createUploadsRepository(prisma);

      await repo.getManyByIds(['u-1', 'u-2']);

      expect(upload.findMany).toHaveBeenCalledWith({ where: { id: { in: ['u-1', 'u-2'] } } });
    });

    it('returns exactly the records resolved by findMany', async () => {
      const { prisma, upload } = createPrismaStub();
      const repo = createUploadsRepository(prisma);
      const records = [uploadRecord({ id: 'u-1' }), uploadRecord({ id: 'u-2' })];
      upload.findMany.mockResolvedValue(records);

      const result = await repo.getManyByIds(['u-1', 'u-2']);

      expect(result).toEqual(records);
    });

    it('returns an empty list when none match', async () => {
      const { prisma } = createPrismaStub();
      const repo = createUploadsRepository(prisma);

      await expect(repo.getManyByIds(['missing'])).resolves.toEqual([]);
    });
  });

  describe('setStatus', () => {
    it('updates the upload status and returns the updated record', async () => {
      const { prisma, upload } = createPrismaStub();
      const repo = createUploadsRepository(prisma);
      const record = uploadRecord({ status: UploadStatus.ACTIVE });
      upload.update.mockResolvedValue(record);

      const result = await repo.setStatus('u-1', UploadStatus.ACTIVE);

      expect(upload.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { status: UploadStatus.ACTIVE },
      });
      expect(result).toEqual(record);
    });
  });
});
