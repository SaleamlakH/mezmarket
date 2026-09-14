import type { ReactNode } from 'react';
import type {
  BusinessResponse,
  CreateBusinessInput,
  CreateBusinessResponse,
  UpdateBusinessInput,
} from '@mez/types';

export type BusinessStatus = 'loading' | 'ready' | 'error';

export interface BusinessService {
  listBusinesses(): Promise<BusinessResponse[]>;
  createBusiness(input: CreateBusinessInput): Promise<CreateBusinessResponse>;
  getBusiness(businessId: string): Promise<BusinessResponse>;
  updateBusiness(businessId: string, input: UpdateBusinessInput): Promise<BusinessResponse>;
}

export interface BusinessContextValue {
  status: BusinessStatus;
  businesses: BusinessResponse[];
  currentBusiness: BusinessResponse | null;
  setCurrentBusiness: (businessId: string) => void;
  refetch: () => void;
}

export interface BusinessProviderProps {
  userId: string | null;
  businessService: BusinessService;
  children: ReactNode;
}
