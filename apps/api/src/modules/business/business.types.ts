import type { Business, Branch, BusinessMember } from '../../../generated/prisma/client.js';

export type { Business, Branch, BusinessMember };

export enum BusinessMemberRole {
  owner = 'OWNER',
  manager = 'MANAGER',
  cashier = 'CASHIER',
  server = 'SERVER',
}

export enum TaxDisplayMode {
  exclusive = 'EXCLUSIVE',
  inclusive = 'INCLUSIVE',
}

export interface CreateBusinessInput {
  name: string;
  currencyCode: string;
  defaultTaxRate?: number;
  taxDisplayMode?: TaxDisplayMode;
  lowStockDefaultThreshold?: number;
}

export type CreateBusinessResult = {
  business: Business;
  branch: Branch;
  member: BusinessMember;
};

export type BusinessRepository = {
  listForOwner(ownerId: string): Promise<Business[]>;
  createForOwner(ownerId: string, input: CreateBusinessInput): Promise<CreateBusinessResult>;
};

export type BusinessService = {
  getBusinesses(ownerId: string | undefined): Promise<Business[]>;
  createBusiness(
    ownerId: string | undefined,
    input: CreateBusinessInput,
  ): Promise<CreateBusinessResult>;
};
