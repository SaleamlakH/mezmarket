import type {
  Business,
  BusinessRepository,
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
      return repository.listForOwner(requireOwnerId(ownerId));
    },

    async createBusiness(
      ownerId: string | undefined,
      input: CreateBusinessInput,
    ): Promise<CreateBusinessResult> {
      return repository.createForOwner(requireOwnerId(ownerId), input);
    },
  };
}
