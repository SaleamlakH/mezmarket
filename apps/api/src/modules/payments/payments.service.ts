import type { PaymentSummaryResponse } from '@mez/types';
import { roundMoney } from '../../shared/utils/rounding.js';
import type { PaymentsRepository, PaymentsService } from './payments.types.js';

export function createPaymentsService(repository: PaymentsRepository): PaymentsService {
  return {
    async getSummary(scope, filters): Promise<PaymentSummaryResponse> {
      const groups = await repository.summarizeByMethod(scope, filters);
      const period = { from: filters.from.toISOString(), to: filters.to.toISOString() };

      // An empty period has nothing to divide by: answer zero rather than
      // inventing a row for every method.
      if (!groups[0]) {
        return { period, groupBy: 'method', total: 0, methods: [] };
      }

      // The total is the sum of the groups, never a second aggregate, so the
      // headline and the breakdown can never disagree.
      const grossTotal = groups.reduce((sum, group) => sum + group.total.toNumber(), 0);
      const total = roundMoney(grossTotal);

      const methods = groups
        .map((group) => ({
          method: group.method,
          total: roundMoney(group.total.toNumber()),
          paymentCount: group.paymentCount,
          sharePercent: roundMoney((group.total.toNumber() / grossTotal) * 100),
        }))
        .sort((left, right) => {
          if (left.total !== right.total) return right.total - left.total;
          if (left.method === right.method) return 0;
          return left.method < right.method ? -1 : 1;
        });

      return { period, groupBy: 'method', total, methods };
    },
  };
}
