import type { RequireAllKeys } from '../shared/require-all-keys.js';

export interface Owner {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UpdateOwnerInput = Partial<Pick<Owner, 'name' | 'contactEmail' | 'contactPhone'>>;

export type OwnerResponse = RequireAllKeys<
  Owner,
  Omit<Owner, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
  }
>;
