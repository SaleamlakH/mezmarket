import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { MembersRepository } from './members.types.js';

export function createMembersRepository(prisma: PrismaClient): MembersRepository {
  return {
    /** The business's active members, by name, for a picker to offer. */
    async list(businessId, branchId, filters) {
      return prisma.businessMember.findMany({
        where: {
          businessId,
          branchId,
          active: true,
          ...(filters.role !== undefined && { role: filters.role }),
        },
        orderBy: { name: 'asc' },
      });
    },
  };
}
