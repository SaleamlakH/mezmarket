import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBusinessService } from '../business.service.js';
import type {
  BusinessRepository,
  BusinessService,
  CreateBusinessInput,
} from '../business.types.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';

function mockRepository(): BusinessRepository {
  return {
    listForOwner: vi.fn(),
    createForOwner: vi.fn(),
  };
}

function input(overrides: Partial<CreateBusinessInput> = {}): CreateBusinessInput {
  return { name: 'Test', currencyCode: 'USD', ...overrides };
}

describe('business.service', () => {
  let repo: BusinessRepository;
  let service: BusinessService;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = mockRepository();
    service = createBusinessService(repo);
  });

  describe('getBusinesses', () => {
    it('throws UNAUTHORIZED when owner id is missing', async () => {
      await expect(service.getBusinesses(undefined)).rejects.toEqual(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );
      expect(repo.listForOwner).not.toHaveBeenCalled();
    });

    it('throws UNAUTHORIZED when owner id is empty', async () => {
      await expect(service.getBusinesses('')).rejects.toBeInstanceOf(AppError);
      expect(repo.listForOwner).not.toHaveBeenCalled();
    });

    it('delegates to listForOwner and returns its result', async () => {
      const businesses = [{ id: 'b-1' }];
      vi.mocked(repo.listForOwner).mockResolvedValue(businesses as never);

      const result = await service.getBusinesses('owner-1');

      expect(repo.listForOwner).toHaveBeenCalledWith('owner-1');
      expect(result).toEqual(businesses);
    });
  });

  describe('createBusiness', () => {
    it('throws UNAUTHORIZED when owner id is missing', async () => {
      await expect(service.createBusiness(undefined, input())).rejects.toEqual(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );
      expect(repo.createForOwner).not.toHaveBeenCalled();
    });

    it('delegates to createForOwner with the owner id and input', async () => {
      const created = { business: {}, branch: {}, member: {} };
      vi.mocked(repo.createForOwner).mockResolvedValue(created as never);

      const result = await service.createBusiness('owner-1', input({ name: 'Shop' }));

      expect(repo.createForOwner).toHaveBeenCalledWith('owner-1', input({ name: 'Shop' }));
      expect(result).toEqual(created);
    });
  });
});
