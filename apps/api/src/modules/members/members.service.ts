import type { MemberPerformanceResponse } from '@mez/types';
import type { MembersRepository, MembersService } from './members.types.js';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';
import { roundMoney } from '../../shared/utils/rounding.js';

export function createMembersService(repository: MembersRepository): MembersService {
  return {
    async list(scope, filters) {
      const records = await repository.list(scope.businessId, scope.branchId, filters);
      return records.map((record) => ({
        id: record.id,
        name: record.name,
        role: record.role,
      }));
    },

    async getPerformance(actor, memberId, period): Promise<MemberPerformanceResponse> {
      const targetMemberId = memberId === 'me' ? actor.memberId : memberId;

      const member = await repository.getMember(actor.businessId, actor.branchId, targetMemberId);

      if (!member) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Member not found', 404);
      }

      /**
       * Applies the performance access rule: a staff member may only read themselves,
       * while the manager tier may read anyone in the same business and branch.
       */
      const isManagerTier = actor.role === 'MANAGER' || actor.role === 'OWNER';

      if (targetMemberId !== actor.memberId && !isManagerTier) {
        throw new AppError(
          ERROR_CODES.FORBIDDEN,
          'You do not have permission to read this member',
          403,
        );
      }

      const read = {
        branchId: actor.branchId,
        memberId: member.id,
        from: period.from,
        to: period.to,
      };

      const [sales, cash, unpaidSalesCount] = await Promise.all([
        repository.memberSalesAggregate(read),
        repository.memberCashAggregate(read),
        repository.memberUnpaidCount(read),
      ]);

      return {
        member: {
          id: member.id,
          name: member.name,
          role: member.role,
        },
        period: {
          from: period.from.toISOString(),
          to: period.to.toISOString(),
        },
        asOf: new Date().toISOString(),
        sales: {
          total: roundMoney(sales.total?.toNumber() ?? 0),
          count: sales.count,
        },
        cashCollected: roundMoney(cash?.toNumber() ?? 0),
        unpaidSalesCount,
      };
    },
  };
}
