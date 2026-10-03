import type {
  Business,
  BusinessRepository,
  BusinessScope,
  BusinessService,
  CreateBusinessInput,
  CreateBusinessResult,
} from './business.types.js';
import { AppError } from '../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../shared/errors/app-error.js';

function requireOwnerId(ownerId: string | undefined): string {
  if (!ownerId) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401);
  }
  return ownerId;
}

export function createBusinessService(repository: BusinessRepository): BusinessService {
  return {
    async getBusinesses(ownerId: string | undefined): Promise<Business[]> {
      const businesses = await repository.listForOwner(requireOwnerId(ownerId));
      return businesses.map((business) => ({
        ...business,
        defaultTaxRate: business.defaultTaxRate?.toNumber() ?? null,
        lowStockDefaultThreshold: business.lowStockDefaultThreshold?.toNumber() ?? null,
      }));
    },

    async createBusiness(
      ownerId: string | undefined,
      input: CreateBusinessInput,
    ): Promise<CreateBusinessResult> {
      const result = await repository.createForOwner(requireOwnerId(ownerId), input);
      return {
        ...result,
        business: {
          ...result.business,
          defaultTaxRate: result.business.defaultTaxRate?.toNumber() ?? null,
          lowStockDefaultThreshold: result.business.lowStockDefaultThreshold?.toNumber() ?? null,
        },
      };
    },

    async resolveScope(ownerId: string, businessId: string): Promise<BusinessScope> {
      const [resolvedBusinessId, branchId, actor] = await Promise.all([
        repository.getBusinessId(ownerId, businessId),
        repository.getBranchId(businessId),
        repository.getActor(businessId, ownerId),
      ]);

      if (!resolvedBusinessId || !branchId || !actor) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Business not found', 404);
      }

      return {
        businessId: resolvedBusinessId,
        branchId,
        memberId: actor.id,
        role: actor.role,
      };
    },
  };
}
