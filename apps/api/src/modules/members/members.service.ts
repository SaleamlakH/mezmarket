import type { BusinessMember as BusinessMemberRecord } from '../../../generated/prisma/client.js';
import type { BusinessMemberSummaryResponse } from '@mez/types';
import type { MembersRepository, MembersService } from './members.types.js';

function toSummary(record: BusinessMemberRecord): BusinessMemberSummaryResponse {
  return {
    id: record.id,
    name: record.name,
    role: record.role,
  };
}

export function createMembersService(repository: MembersRepository): MembersService {
  return {
    async list(scope, filters) {
      const records = await repository.list(scope.businessId, scope.branchId, filters);
      return records.map(toSummary);
    },
  };
}
