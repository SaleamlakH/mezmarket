import type { PrismaClient } from '../../../generated/prisma/client.js';
import type {
  BusinessActor,
  BusinessMemberRole,
  BusinessRepository,
  CreateBusinessInput,
} from './business.types.js';

const BusinessMemberRole = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  CASHIER: 'CASHIER',
  SERVER: 'SERVER',
} satisfies Record<BusinessMemberRole, BusinessMemberRole>;

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
            ...(input.taxDisplayMode !== undefined && {
              taxDisplayMode: input.taxDisplayMode,
            }),
            ...(input.defaultTaxRate !== undefined && {
              defaultTaxRate: input.defaultTaxRate,
            }),
            ...(input.lowStockDefaultThreshold !== undefined && {
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

    async getBusinessId(ownerId: string, businessId: string): Promise<string | null> {
      const business = await prisma.business.findFirst({
        where: { id: businessId, ownerId },
        select: { id: true },
      });

      return business?.id ?? null;
    },

    async getBranchId(businessId: string): Promise<string | null> {
      const branch = await prisma.branch.findFirst({
        where: { businessId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });

      return branch?.id ?? null;
    },

    /**
     * The member an owner acts as within one business. A deactivated member
     * row stays behind for the audit trail, so an inactive one resolves to
     * nothing rather than to a member who can no longer act.
     */
    async getActor(businessId: string, ownerId: string): Promise<BusinessActor | null> {
      const member = await prisma.businessMember.findFirst({
        where: { businessId, ownerId, active: true },
        select: { id: true, role: true },
      });

      return member ?? null;
    },
  };
}
