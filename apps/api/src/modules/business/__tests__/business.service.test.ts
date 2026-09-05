import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBusinessService } from '../business.service.js';
import type {
  BusinessRepository,
  BusinessService,
  CreateBusinessInput,
} from '../business.types.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';

const isoNow = '2026-01-01T00:00:00.000Z';
const now = new Date(isoNow);

function rawBusinessRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'b-1',
    ownerId: 'owner-1',
    name: 'Test',
    currencyCode: 'USD',
    defaultTaxRate: { toString: () => '5.0000' },
    taxDisplayMode: 'EXCLUSIVE',
    allowNegativeStock: true,
    lowStockDefaultThreshold: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function rawBranchRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'br-1',
    businessId: 'b-1',
    name: 'main',
    address: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function rawMemberRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'm-1',
    businessId: 'b-1',
    branchId: 'br-1',
    ownerId: 'owner-1',
    name: 'me',
    role: 'OWNER',
    active: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function businessDto(id = 'b-1') {
  return {
    id,
    ownerId: 'owner-1',
    name: 'Test',
    currencyCode: 'USD',
    defaultTaxRate: '5.0000',
    taxDisplayMode: 'EXCLUSIVE',
    allowNegativeStock: true,
    lowStockDefaultThreshold: null,
    createdAt: isoNow,
    updatedAt: isoNow,
  };
}

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

    it('maps rows to the wire DTO', async () => {
      vi.mocked(repo.listForOwner).mockResolvedValue([
        rawBusinessRow(),
        rawBusinessRow({ id: 'b-2' }),
      ] as never);

      const result = await service.getBusinesses('owner-1');

      expect(repo.listForOwner).toHaveBeenCalledWith('owner-1');
      expect(result).toEqual([businessDto('b-1'), businessDto('b-2')]);
    });
  });

  describe('createBusiness', () => {
    it('throws UNAUTHORIZED when owner id is missing', async () => {
      await expect(service.createBusiness(undefined, input())).rejects.toEqual(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );
      expect(repo.createForOwner).not.toHaveBeenCalled();
    });

    it('maps the created rows to the wire response', async () => {
      vi.mocked(repo.createForOwner).mockResolvedValue({
        business: rawBusinessRow(),
        branch: rawBranchRow(),
        member: rawMemberRow(),
      } as never);

      const result = await service.createBusiness('owner-1', input({ name: 'Shop' }));

      expect(repo.createForOwner).toHaveBeenCalledWith('owner-1', input({ name: 'Shop' }));
      expect(result).toEqual({
        business: businessDto('b-1'),
        branch: {
          id: 'br-1',
          businessId: 'b-1',
          name: 'main',
          address: null,
          createdAt: isoNow,
          updatedAt: isoNow,
        },
        member: {
          id: 'm-1',
          businessId: 'b-1',
          branchId: 'br-1',
          ownerId: 'owner-1',
          name: 'me',
          role: 'OWNER',
          active: true,
          createdAt: isoNow,
          updatedAt: isoNow,
        },
      });
    });
  });
});
