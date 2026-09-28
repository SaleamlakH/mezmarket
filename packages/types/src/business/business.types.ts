import type { RequireAllKeys } from '../shared/require-all-keys.js';

export type TaxDisplayMode = 'EXCLUSIVE' | 'INCLUSIVE';

export type BusinessMemberRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'SERVER';

/**
 * Domain shape of a Business as stored in the database.
 */
export interface Business {
  id: string;
  ownerId: string;
  name: string;
  currencyCode: string;
  defaultTaxRate: number | null;
  taxDisplayMode: TaxDisplayMode;
  allowNegativeStock: boolean;
  lowStockDefaultThreshold: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * JSON-serialized form sent to the frontend.
 */
export type BusinessResponse = RequireAllKeys<
  Business,
  Omit<Business, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
  }
>;

/**
 * Domain shape of a Branch as stored in the database.
 */
export interface Branch {
  id: string;
  businessId: string;
  name: string;
  address?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * JSON-serialized form sent to the frontend.
 */
export type BranchResponse = RequireAllKeys<
  Branch,
  Required<Omit<Branch, 'createdAt' | 'updatedAt'>> & {
    createdAt: string;
    updatedAt: string;
  }
>;

/**
 * Domain shape of a BusinessMember as stored in the database.
 */
export interface BusinessMember {
  id: string;
  businessId: string;
  branchId: string;
  ownerId?: string | null;
  name: string;
  role: BusinessMemberRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * JSON-serialized form sent to the frontend.
 */
export type BusinessMemberResponse = RequireAllKeys<
  BusinessMember,
  Required<Omit<BusinessMember, 'createdAt' | 'updatedAt'>> & {
    createdAt: string;
    updatedAt: string;
  }
>;

/**
 * Trimmed member projection embedded in other response payloads, so a
 * response can name its actor without shipping the whole member record.
 */
export type BusinessMemberSummaryResponse = Pick<BusinessMemberResponse, 'id' | 'name' | 'role'>;

export type CreateBusinessInput = Pick<Business, 'name' | 'currencyCode'> & {
  defaultTaxRate?: number;
  taxDisplayMode?: TaxDisplayMode;
  lowStockDefaultThreshold?: number;
};

/**
 * Return shape of a CreateBusiness
 */
export interface CreateBusinessResult {
  business: Business;
  branch: Branch;
  member: BusinessMember;
}

/**
 * JSON-serialized form sent to the frontend.
 */
export type CreateBusinessResponse = RequireAllKeys<
  CreateBusinessResult,
  {
    business: BusinessResponse;
    branch: BranchResponse;
    member: BusinessMemberResponse;
  }
>;
