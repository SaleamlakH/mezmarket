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

function decimal(value: number) {
  return { toNumber: () => value };
}

function prismaBusiness(overrides: Record<string, unknown> = {}) {
  return {
    id: 'b-1',
    ownerId: 'owner-1',
    name: 'Shop',
    currencyCode: 'USD',
    defaultTaxRate: null,
    taxDisplayMode: 'EXCLUSIVE',
    allowNegativeStock: true,
    lowStockDefaultThreshold: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
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

    it('maps stored businesses to the domain shape', async () => {
      const businesses = [prismaBusiness()];
      vi.mocked(repo.listForOwner).mockResolvedValue(businesses as never);

      const result = await service.getBusinesses('owner-1');

      expect(repo.listForOwner).toHaveBeenCalledWith('owner-1');
      expect(result).toEqual([
        {
          id: 'b-1',
          ownerId: 'owner-1',
          name: 'Shop',
          currencyCode: 'USD',
          defaultTaxRate: null,
          taxDisplayMode: 'EXCLUSIVE',
          allowNegativeStock: true,
          lowStockDefaultThreshold: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]);
    });

    it('converts non-null decimals to numbers', async () => {
      const businesses = [
        prismaBusiness({
          defaultTaxRate: decimal(15),
          lowStockDefaultThreshold: decimal(10),
        }),
      ];
      vi.mocked(repo.listForOwner).mockResolvedValue(businesses as never);

      const result = await service.getBusinesses('owner-1');

      expect(result[0]).toMatchObject({ defaultTaxRate: 15, lowStockDefaultThreshold: 10 });
    });

    it('keeps a zero decimal as 0 instead of nulling it', async () => {
      const businesses = [
        prismaBusiness({
          defaultTaxRate: decimal(0),
          lowStockDefaultThreshold: decimal(0),
        }),
      ];
      vi.mocked(repo.listForOwner).mockResolvedValue(businesses as never);

      const result = await service.getBusinesses('owner-1');

      expect(result[0]).toMatchObject({ defaultTaxRate: 0, lowStockDefaultThreshold: 0 });
    });
  });

  describe('createBusiness', () => {
    it('throws UNAUTHORIZED when owner id is missing', async () => {
      await expect(service.createBusiness(undefined, input())).rejects.toEqual(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );
      expect(repo.createForOwner).not.toHaveBeenCalled();
    });

    it('maps the created records to the domain shape', async () => {
      const record = {
        business: prismaBusiness({ defaultTaxRate: decimal(15) }),
        branch: {
          id: 'br-1',
          businessId: 'b-1',
          name: 'main',
          address: null,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
        member: {
          id: 'm-1',
          businessId: 'b-1',
          branchId: 'br-1',
          ownerId: 'owner-1',
          name: 'me',
          role: 'OWNER',
          active: true,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      };
      vi.mocked(repo.createForOwner).mockResolvedValue(record as never);

      const result = await service.createBusiness('owner-1', input({ name: 'Shop' }));

      expect(repo.createForOwner).toHaveBeenCalledWith('owner-1', input({ name: 'Shop' }));
      expect(result).toEqual({
        ...record,
        business: {
          ...record.business,
          defaultTaxRate: 15,
          lowStockDefaultThreshold: null,
        },
      });
    });

    it('keeps a zero decimal as 0 instead of nulling it', async () => {
      const record = {
        business: prismaBusiness({
          defaultTaxRate: decimal(0),
          lowStockDefaultThreshold: decimal(0),
        }),
        branch: { id: 'br-1' },
        member: { id: 'm-1' },
      };
      vi.mocked(repo.createForOwner).mockResolvedValue(record as never);

      const result = await service.createBusiness('owner-1', input());

      expect(result.business.defaultTaxRate).toBe(0);
      expect(result.business.lowStockDefaultThreshold).toBe(0);
    });
  });
});
