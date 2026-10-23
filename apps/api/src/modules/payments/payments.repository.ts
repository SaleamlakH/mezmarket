import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { PaymentsRepository } from './payments.types.js';

export function createPaymentsRepository(prisma: PrismaClient): PaymentsRepository {
  return {
    async summarizeByMethod({ businessId, branchId }, { from, to }) {
      const groups = await prisma.payment.groupBy({
        by: ['method'],
        // The period is half open — `[from, to)` — so a payment stamped exactly
        // at the next period's start belongs to that period only.
        where: {
          paidAt: { gte: from, lt: to },
          sale: { businessId, branchId, voidStatus: { not: 'VOIDED' } },
        },
        _sum: { amount: true },
        _count: { _all: true },
      });

      // A group always holds at least one payment, so a null sum cannot occur;
      // dropping it rather than reading it as zero keeps the group arithmetic
      // honest if the schema ever changes.
      return groups.flatMap((group) =>
        group._sum.amount === null
          ? []
          : [
              {
                method: group.method,
                total: group._sum.amount,
                paymentCount: group._count._all,
              },
            ],
      );
    },
  };
}
