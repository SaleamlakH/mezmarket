import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import type { MemberPerformanceRead, MembersRepository } from './members.types.js';

/** A sale the member either processed or served, in the period, and not voided. */
function memberSalesWhere({
  branchId,
  memberId,
  from,
  to,
}: MemberPerformanceRead): Prisma.SaleWhereInput {
  return {
    branchId,
    voidStatus: { not: 'VOIDED' },
    saleDatetime: { gte: from, lte: to },
    OR: [{ processedByMemberId: memberId }, { serverMemberId: memberId }],
  };
}

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

    /**
     * One member inside the resolved business and branch. Deliberately no
     * `active` filter: performance reads cover inactive members too.
     */
    async getMember(businessId, branchId, memberId) {
      return prisma.businessMember.findFirst({
        where: { id: memberId, businessId, branchId },
      });
    },

    async memberSalesAggregate(read) {
      const result = await prisma.sale.aggregate({
        where: memberSalesWhere(read),
        _sum: { total: true },
        _count: true,
      });

      return { total: result._sum.total, count: result._count };
    },

    async memberCashAggregate({ branchId, memberId, from, to }) {
      const result = await prisma.payment.aggregate({
        where: {
          businessMemberId: memberId,
          paidAt: { gte: from, lte: to },
          sale: { branchId, voidStatus: { not: 'VOIDED' } },
        },
        _sum: { amount: true },
      });

      return result._sum.amount;
    },

    async memberUnpaidCount(read) {
      return prisma.sale.count({
        where: { ...memberSalesWhere(read), balanceDue: { gt: 0 } },
      });
    },
  };
}
