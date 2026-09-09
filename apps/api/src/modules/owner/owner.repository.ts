import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { OwnerRepository, UpdateOwnerInput } from './owner.types.js';

export function createOwnerRepository(prisma: PrismaClient): OwnerRepository {
  return {
    async findOwnerById(ownerId: string) {
      return prisma.owner.findUnique({ where: { id: ownerId } });
    },

    async updateOwner(ownerId: string, data: UpdateOwnerInput) {
      return prisma.owner.update({ where: { id: ownerId }, data });
    },
  };
}
