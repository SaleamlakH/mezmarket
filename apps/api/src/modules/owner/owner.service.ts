import type { OwnerRepository, Owner, UpdateOwnerInput } from './owner.types.js';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';

function requireOwnerId(ownerId: string | undefined): string {
  if (!ownerId) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Missing owner id', 401);
  }
  return ownerId;
}

export function createOwnerService(repository: OwnerRepository) {
  return {
    async getOwner(ownerId: string | undefined): Promise<Owner> {
      const resolvedId = requireOwnerId(ownerId);
      const owner = await repository.findOwnerById(resolvedId);

      if (!owner) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Owner not found', 404);
      }

      return owner;
    },

    async updateOwner(ownerId: string | undefined, data: UpdateOwnerInput): Promise<Owner> {
      const resolvedId = requireOwnerId(ownerId);
      const owner = await repository.findOwnerById(resolvedId);

      if (!owner) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Owner not found', 404);
      }

      return repository.updateOwner(resolvedId, data);
    },
  };
}
