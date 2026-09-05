import type { Business, Branch, BusinessMember, CreateBusinessResponse } from '@mez/types';
import type {
  Business as PrismaBusiness,
  Branch as PrismaBranch,
  BusinessMember as PrismaBusinessMember,
} from '../../../generated/prisma/client.js';
import type { CreateBusinessResult } from './business.types.js';

export function toBusinessDto(row: PrismaBusiness): Business {
  return {
    ...row,
    defaultTaxRate: row.defaultTaxRate?.toString() ?? null,
    lowStockDefaultThreshold: row.lowStockDefaultThreshold?.toString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toBranchDto(row: PrismaBranch): Branch {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toMemberDto(row: PrismaBusinessMember): BusinessMember {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toCreateBusinessResponse(result: CreateBusinessResult): CreateBusinessResponse {
  return {
    business: toBusinessDto(result.business),
    branch: toBranchDto(result.branch),
    member: toMemberDto(result.member),
  };
}
