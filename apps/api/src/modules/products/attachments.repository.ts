import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { AttachmentsRepository } from './products.types.js';

export function createAttachmentsRepository(prisma: PrismaClient): AttachmentsRepository {
  return {
    async listForRecord(recordType, recordIds) {
      return prisma.attachment.findMany({
        where: { recordType, recordId: { in: recordIds }, deletedAt: null },
      });
    },

    async getForRecord(recordType, recordId) {
      return prisma.attachment.findFirst({
        where: { recordType, recordId, deletedAt: null },
      });
    },
  };
}
