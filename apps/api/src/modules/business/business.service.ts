import type { Business, CreateBusinessInput, CreateBusinessResponse } from '@mez/types';
import type { BusinessRepository, BusinessService } from './business.types.js';
import { toBusinessDto, toCreateBusinessResponse } from './business.mappers.js';
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
      const rows = await repository.listForOwner(requireOwnerId(ownerId));
      return rows.map(toBusinessDto);
    },

    async createBusiness(
      ownerId: string | undefined,
      input: CreateBusinessInput,
    ): Promise<CreateBusinessResponse> {
      const result = await repository.createForOwner(requireOwnerId(ownerId), input);
      return toCreateBusinessResponse(result);
    },
  };
}
