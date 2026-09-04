import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { AuthRepository } from './auth.types.js';

export function createAuthRepository(prisma: PrismaClient): AuthRepository {
  return {
    async findIdentity(providerUserId: string) {
      return prisma.accountIdentity.findUnique({
        where: { providerUserId },
      });
    },

    async createIdentity(providerUserId: string, email?: string) {
      return prisma.$transaction(async (tx) => {
        const owner = await tx.owner.create({
          data: { name: 'New User', contactEmail: email ?? null },
        });

        return await tx.accountIdentity.create({
          data: { providerUserId, ownerId: owner.id },
        });
      });
    },
  };
}
