import type { Business as BusinessRecord } from '../../../generated/prisma/client.js';
import type {
  Business,
  BusinessRepository,
  BusinessScope,
  BusinessService,
  CreateBusinessInput,
  CreateBusinessResult,
  UpdateBusinessInput,
} from './business.types.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../shared/errors/app-error.js';

function requireOwnerId(ownerId: string | undefined): string {
  if (!ownerId) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401);
  }
  return ownerId;
}

function toDomainBusiness(business: BusinessRecord): Business {
  return {
    ...business,
    defaultTaxRate: business.defaultTaxRate?.toNumber() ?? null,
    lowStockDefaultThreshold: business.lowStockDefaultThreshold?.toNumber() ?? null,
  };
}

export function createBusinessService(repository: BusinessRepository): BusinessService {
  return {
    async getBusinesses(ownerId: string | undefined): Promise<Business[]> {
      const businesses = await repository.listForOwner(requireOwnerId(ownerId));
      return businesses.map(toDomainBusiness);
    },

    async createBusiness(
      ownerId: string | undefined,
      input: CreateBusinessInput,
    ): Promise<CreateBusinessResult> {
      const result = await repository.createForOwner(requireOwnerId(ownerId), input);

      return {
        ...result,
        business: toDomainBusiness(result.business),
      };
    },

    async resolveScope(ownerId: string, businessId: string): Promise<BusinessScope> {
      const [resolvedBusinessId, branchId] = await Promise.all([
        repository.getBusinessId(ownerId, businessId),
        repository.getBranchId(businessId),
      ]);

      if (!resolvedBusinessId || !branchId) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Business not found', 404);
      }

      return { businessId: resolvedBusinessId, branchId };
    },

    async getBusiness(businessId: string, ownerId: string | undefined): Promise<Business> {
      const business = await repository.getForOwner(businessId, requireOwnerId(ownerId));

      if (!business) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Business not found', 404);
      }

      return toDomainBusiness(business);
    },

    async updateBusiness(
      businessId: string,
      ownerId: string | undefined,
      input: UpdateBusinessInput,
    ): Promise<Business> {
      const business = await repository.getForOwner(businessId, requireOwnerId(ownerId));

      if (!business) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Business not found', 404);
      }

      const updated = await repository.updateForOwner(businessId, input);
      return toDomainBusiness(updated);
    },
  };
}
