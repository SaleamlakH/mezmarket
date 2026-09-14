import type { Owner, UpdateOwnerInput } from '@mez/types';

export type { Owner, UpdateOwnerInput };

export type OwnerRepository = {
  findOwnerById(ownerId: string): Promise<Owner | null>;
  updateOwner(ownerId: string, data: UpdateOwnerInput): Promise<Owner>;
};

export type OwnerService = {
  getOwner(ownerId: string | undefined): Promise<Owner>;
  updateOwner(ownerId: string | undefined, data: UpdateOwnerInput): Promise<Owner>;
};
