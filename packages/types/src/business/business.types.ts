export type TaxDisplayMode = 'EXCLUSIVE' | 'INCLUSIVE';

export type BusinessMemberRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'SERVER';

/**
 * Wire shape of a Business. Timestamps are ISO strings and decimal columns are
 * stringified (e.g. "0.15") for JSON transport.
 */
export interface Business {
  id: string;
  ownerId: string;
  name: string;
  currencyCode: string;
  defaultTaxRate?: string | null;
  taxDisplayMode: TaxDisplayMode;
  allowNegativeStock: boolean;
  lowStockDefaultThreshold?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  businessId: string;
  name: string;
  address?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessMember {
  id: string;
  businessId: string;
  branchId: string;
  ownerId?: string | null;
  name: string;
  role: BusinessMemberRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateBusinessInput = Pick<Business, 'name' | 'currencyCode'> & {
  defaultTaxRate?: number;
  taxDisplayMode?: TaxDisplayMode;
  lowStockDefaultThreshold?: number;
};

export interface CreateBusinessResponse {
  business: Business;
  branch: Branch;
  member: BusinessMember;
}
