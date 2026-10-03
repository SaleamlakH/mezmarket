import type {
  Business,
  BusinessMemberRole,
  CreateBusinessInput,
  CreateBusinessResult,
} from '@mez/types';

import type {
  Business as BusinessRecord,
  Branch,
  BusinessMember,
} from '../../../generated/prisma/client.js';

export type { Business, BusinessMemberRole, CreateBusinessInput, CreateBusinessResult };

export interface CreateBusinessRecord {
  business: BusinessRecord;
  branch: Branch;
  member: BusinessMember;
}

export type BusinessScope = {
  businessId: string;
  branchId: string;
  memberId: string;
  role: BusinessMemberRole;
};

export type BusinessActor = {
  id: string;
  role: BusinessMemberRole;
};

export type BusinessRepository = {
  listForOwner(ownerId: string): Promise<BusinessRecord[]>;
  createForOwner(ownerId: string, input: CreateBusinessInput): Promise<CreateBusinessRecord>;
  getBusinessId(ownerId: string, businessId: string): Promise<string | null>;
  getBranchId(businessId: string): Promise<string | null>;
  getActor(businessId: string, ownerId: string): Promise<BusinessActor | null>;
};

export type BusinessService = {
  getBusinesses(ownerId: string | undefined): Promise<Business[]>;
  createBusiness(
    ownerId: string | undefined,
    input: CreateBusinessInput,
  ): Promise<CreateBusinessResult>;
  resolveScope(ownerId: string, businessId: string): Promise<BusinessScope>;
};
