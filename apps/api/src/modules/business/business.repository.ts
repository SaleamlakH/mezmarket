import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { BusinessMemberRole } from '@mez/types';
import { type BusinessRepository, type CreateBusinessInput } from './business.types.js';

const BusinessMemberRole = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  CASHIER: 'CASHIER',
  SERVER: 'SERVER',
} as const satisfies Record<BusinessMemberRole, BusinessMemberRole>;

export function createBusinessRepository(prisma: PrismaClient): BusinessRepository {
  return {
    async listForOwner(ownerId: string) {
      return prisma.business.findMany({
        where: { ownerId },
        orderBy: { createdAt: 'asc' },
      });
    },

    async createForOwner(ownerId: string, input: CreateBusinessInput) {
      return prisma.$transaction(async (tx) => {
        const business = await tx.business.create({
          data: {
            ownerId,
            name: input.name,
            currencyCode: input.currencyCode,
            ...(input.taxDisplayMode && {
              taxDisplayMode: input.taxDisplayMode,
            }),
            ...(input.defaultTaxRate && {
              defaultTaxRate: input.defaultTaxRate,
            }),
            ...(input.lowStockDefaultThreshold && {
              lowStockDefaultThreshold: input.lowStockDefaultThreshold,
            }),
          },
        });

        const branch = await tx.branch.create({
          data: {
            businessId: business.id,
          },
        });

        const member = await tx.businessMember.create({
          data: {
            businessId: business.id,
            branchId: branch.id,
            ownerId,
            name: 'me',
            role: BusinessMemberRole.OWNER,
          },
        });

        return { business, branch, member };
      });
    },
  };
}
