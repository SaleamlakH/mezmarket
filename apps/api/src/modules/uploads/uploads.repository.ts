import type { PrismaClient } from '../../../generated/prisma/client.js';
import { UploadStatus } from '../../../generated/prisma/client.js';
import type { UploadRecord, UploadRepository } from './uploads.types.js';

export function createUploadsRepository(prisma: PrismaClient): UploadRepository {
  return {
    async create(input: {
      id: string;
      storageKey: string;
      mimeType: string | null;
      sizeBytes: number | null;
    }): Promise<UploadRecord> {
      return prisma.upload.create({
        data: {
          id: input.id,
          storageKey: input.storageKey,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes,
          status: UploadStatus.PENDING,
        },
      });
    },

    async getById(uploadId: string): Promise<UploadRecord | null> {
      return prisma.upload.findUnique({
        where: { id: uploadId },
      });
    },

    async getManyByIds(uploadIds: string[]): Promise<UploadRecord[]> {
      return prisma.upload.findMany({
        where: { id: { in: uploadIds } },
      });
    },

    async setStatus(uploadId: string, status: UploadStatus) {
      return prisma.upload.update({
        where: { id: uploadId },
        data: { status },
      });
    },
  };
}
