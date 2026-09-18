import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAttachmentsRepository } from '../attachments.repository.js';
import type { AttachmentsRepository } from '../products.types.js';
import { AttachmentRecordType } from '../../../../generated/prisma/client.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';

function createPrismaStub() {
  const attachment = {
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
  };
  const prisma = { attachment } as unknown as PrismaClient;
  return { prisma, attachment };
}

describe('attachments.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an object implementing AttachmentsRepository', () => {
    const { prisma } = createPrismaStub();
    const repo = createAttachmentsRepository(prisma) satisfies AttachmentsRepository;

    expect(typeof repo.listForRecord).toBe('function');
    expect(typeof repo.getForRecord).toBe('function');
  });

  describe('listForRecord', () => {
    it('fetches live attachments for the record type and ids', async () => {
      const { prisma, attachment } = createPrismaStub();
      const repo = createAttachmentsRepository(prisma);
      attachment.findMany.mockResolvedValue([{ id: 'a-1', uploadId: 'u-1' }]);

      const result = await repo.listForRecord(AttachmentRecordType.PRODUCT, ['p-1', 'p-2']);

      expect(attachment.findMany).toHaveBeenCalledWith({
        where: {
          recordType: AttachmentRecordType.PRODUCT,
          recordId: { in: ['p-1', 'p-2'] },
          deletedAt: null,
        },
      });
      expect(result).toEqual([{ id: 'a-1', uploadId: 'u-1' }]);
    });
  });

  describe('getForRecord', () => {
    it('fetches a single live attachment for the record type and id', async () => {
      const { prisma, attachment } = createPrismaStub();
      const repo = createAttachmentsRepository(prisma);
      attachment.findFirst.mockResolvedValue({ id: 'a-1', uploadId: 'u-1' });

      const result = await repo.getForRecord(AttachmentRecordType.PRODUCT, 'p-1');

      expect(attachment.findFirst).toHaveBeenCalledWith({
        where: {
          recordType: AttachmentRecordType.PRODUCT,
          recordId: 'p-1',
          deletedAt: null,
        },
      });
      expect(result).toEqual({ id: 'a-1', uploadId: 'u-1' });
    });

    it('returns null when no live attachment exists', async () => {
      const { prisma } = createPrismaStub();
      const repo = createAttachmentsRepository(prisma);

      const result = await repo.getForRecord(AttachmentRecordType.PRODUCT, 'p-1');

      expect(result).toBeNull();
    });
  });
});
