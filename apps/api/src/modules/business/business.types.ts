import type {
  Business as PrismaBusiness,
  Branch as PrismaBranch,
  BusinessMember as PrismaBusinessMember,
} from '../../../generated/prisma/client.js';
import type { Business, CreateBusinessInput, CreateBusinessResponse } from '@mez/types';

export type { CreateBusinessInput, CreateBusinessResponse } from '@mez/types';

export type CreateBusinessResult = {
  business: PrismaBusiness;
  branch: PrismaBranch;
  member: PrismaBusinessMember;
};

export type BusinessRepository = {
  listForOwner(ownerId: string): Promise<PrismaBusiness[]>;
  createForOwner(ownerId: string, input: CreateBusinessInput): Promise<CreateBusinessResult>;
};

export type BusinessService = {
  getBusinesses(ownerId: string | undefined): Promise<Business[]>;
  createBusiness(
    ownerId: string | undefined,
    input: CreateBusinessInput,
  ): Promise<CreateBusinessResponse>;
};
