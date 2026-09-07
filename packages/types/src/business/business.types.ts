export type TaxDisplayMode = 'EXCLUSIVE' | 'INCLUSIVE';

export type BusinessMemberRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'SERVER';

/**
 * Constrains `T` so every key of `Source` must be present, forcing derived
 * response types to mirror the source type's keys.
 */
type RequireAllKeys<Source, T extends Record<keyof Source, unknown>> = T;

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
