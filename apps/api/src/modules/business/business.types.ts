import type {
  Business,
  BusinessMemberRole,
  CreateBusinessInput,
  CreateBusinessResult,
  UpdateBusinessInput,
} from '@mez/types';

import type {
  Business as BusinessRecord,
  Branch,
  BusinessMember,
} from '../../../generated/prisma/client.js';

export type {
  Business,
  BusinessMemberRole,
  CreateBusinessInput,
  CreateBusinessResult,
  UpdateBusinessInput,
};

export interface CreateBusinessRecord {
  business: BusinessRecord;
  branch: Branch;
  member: BusinessMember;
}

export type BusinessScope = {
  businessId: string;
  branchId: string;
};

export type BusinessRepository = {
  listForOwner(ownerId: string): Promise<BusinessRecord[]>;
  createForOwner(ownerId: string, input: CreateBusinessInput): Promise<CreateBusinessRecord>;
  getBusinessId(ownerId: string, businessId: string): Promise<string | null>;
  getBranchId(businessId: string): Promise<string | null>;
  getForOwner(businessId: string, ownerId: string): Promise<BusinessRecord | null>;
  updateForOwner(businessId: string, input: UpdateBusinessInput): Promise<BusinessRecord>;
};

export type BusinessService = {
  getBusinesses(ownerId: string | undefined): Promise<Business[]>;
  createBusiness(
    ownerId: string | undefined,
    input: CreateBusinessInput,
  ): Promise<CreateBusinessResult>;
  resolveScope(ownerId: string, businessId: string): Promise<BusinessScope>;
  getBusiness(businessId: string, ownerId: string | undefined): Promise<Business>;
  updateBusiness(
    businessId: string,
    ownerId: string | undefined,
    input: UpdateBusinessInput,
  ): Promise<Business>;
};
