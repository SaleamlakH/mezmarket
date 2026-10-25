import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBusinessService } from '../business.service.js';
import type {
  BusinessRepository,
  BusinessService,
  CreateBusinessInput,
  UpdateBusinessInput,
} from '../business.types.js';
import { AppError, ERROR_CODES } from '../../../shared/errors/app-error.js';

function mockRepository(): BusinessRepository {
  return {
    listForOwner: vi.fn(),
    createForOwner: vi.fn(),
    getBusinessId: vi.fn(),
    getBranchId: vi.fn(),
    getForOwner: vi.fn(),
    updateForOwner: vi.fn(),
    getActor: vi.fn(),
  };
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
    taxOnSales: false,
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
          taxOnSales: false,
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
    function input(overrides: Partial<CreateBusinessInput> = {}): CreateBusinessInput {
      return { name: 'Test', currencyCode: 'USD', ...overrides };
    }

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

  describe('resolveScope', () => {
    it('returns the scope and the acting member when all three resolve', async () => {
      vi.mocked(repo.getBusinessId).mockResolvedValue('b-1');
      vi.mocked(repo.getBranchId).mockResolvedValue('br-1');
      vi.mocked(repo.getActor).mockResolvedValue({ id: 'm-1', role: 'OWNER' });

      const result = await service.resolveScope('owner-1', 'b-1');

      expect(repo.getBusinessId).toHaveBeenCalledWith('owner-1', 'b-1');
      expect(repo.getBranchId).toHaveBeenCalledWith('b-1');
      expect(repo.getActor).toHaveBeenCalledWith('b-1', 'owner-1');
      expect(result).toEqual({
        businessId: 'b-1',
        branchId: 'br-1',
        memberId: 'm-1',
        role: 'OWNER',
      });
    });

    it('carries the role the member holds rather than assuming one', async () => {
      vi.mocked(repo.getBusinessId).mockResolvedValue('b-1');
      vi.mocked(repo.getBranchId).mockResolvedValue('br-1');
      vi.mocked(repo.getActor).mockResolvedValue({ id: 'm-2', role: 'MANAGER' });

      await expect(service.resolveScope('owner-1', 'b-1')).resolves.toMatchObject({
        memberId: 'm-2',
        role: 'MANAGER',
      });
    });

    it('throws NOT_FOUND when the business is not owned', async () => {
      vi.mocked(repo.getBusinessId).mockResolvedValue(null);
      vi.mocked(repo.getBranchId).mockResolvedValue('br-1');
      vi.mocked(repo.getActor).mockResolvedValue({ id: 'm-1', role: 'OWNER' });

      await expect(service.resolveScope('owner-1', 'missing')).rejects.toEqual(
        new AppError(ERROR_CODES.NOT_FOUND, 'Business not found', 404),
      );
      expect(repo.getBranchId).toHaveBeenCalled();
    });

    it('throws NOT_FOUND when the business has no branch', async () => {
      vi.mocked(repo.getBusinessId).mockResolvedValue('b-1');
      vi.mocked(repo.getBranchId).mockResolvedValue(null);
      vi.mocked(repo.getActor).mockResolvedValue({ id: 'm-1', role: 'OWNER' });

      await expect(service.resolveScope('owner-1', 'b-1')).rejects.toEqual(
        new AppError(ERROR_CODES.NOT_FOUND, 'Business not found', 404),
      );
    });

    it('throws NOT_FOUND when the owner has no active member row in the business', async () => {
      vi.mocked(repo.getBusinessId).mockResolvedValue('b-1');
      vi.mocked(repo.getBranchId).mockResolvedValue('br-1');
      vi.mocked(repo.getActor).mockResolvedValue(null);

      await expect(service.resolveScope('owner-1', 'b-1')).rejects.toEqual(
        new AppError(ERROR_CODES.NOT_FOUND, 'Business not found', 404),
      );
    });
  });

  describe('getBusiness', () => {
    it('throws UNAUTHORIZED when owner id is missing', async () => {
      await expect(service.getBusiness('b-1', undefined)).rejects.toEqual(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );

      expect(repo.getForOwner).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND when the business is not owned by the owner', async () => {
      vi.mocked(repo.getForOwner).mockResolvedValue(null);

      await expect(service.getBusiness('b-1', 'owner-1')).rejects.toEqual(
        expect.objectContaining({ code: 'NOT_FOUND', statusCode: 404 }),
      );

      expect(repo.getForOwner).toHaveBeenCalledWith('b-1', 'owner-1');
    });

    it('maps the stored business to the domain shape', async () => {
      vi.mocked(repo.getForOwner).mockResolvedValue(prismaBusiness() as never);

      const result = await service.getBusiness('b-1', 'owner-1');

      expect(repo.getForOwner).toHaveBeenCalledWith('b-1', 'owner-1');
      expect(result).toEqual({
        id: 'b-1',
        ownerId: 'owner-1',
        name: 'Shop',
        currencyCode: 'USD',
        defaultTaxRate: null,
        taxOnSales: false,
        allowNegativeStock: true,
        lowStockDefaultThreshold: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
    });

    it('converts non-null decimals to numbers', async () => {
      vi.mocked(repo.getForOwner).mockResolvedValue(
        prismaBusiness({
          defaultTaxRate: decimal(15),
          lowStockDefaultThreshold: decimal(10),
        }) as never,
      );

      const result = await service.getBusiness('b-1', 'owner-1');

      expect(result).toMatchObject({ defaultTaxRate: 15, lowStockDefaultThreshold: 10 });
    });
  });

  describe('updateBusiness', () => {
    function updateInput(overrides: Partial<UpdateBusinessInput> = {}): UpdateBusinessInput {
      return {
        name: 'Test',
        currencyCode: 'USD',
        defaultTaxRate: null,
        taxOnSales: false,
        allowNegativeStock: true,
        lowStockDefaultThreshold: null,
        ...overrides,
      };
    }

    it('throws UNAUTHORIZED when owner id is missing', async () => {
      await expect(service.updateBusiness('b-1', undefined, updateInput())).rejects.toEqual(
        new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401),
      );
      expect(repo.getForOwner).not.toHaveBeenCalled();
      expect(repo.updateForOwner).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND when the business is not owned by the owner', async () => {
      vi.mocked(repo.getForOwner).mockResolvedValue(null);

      await expect(service.updateBusiness('b-1', 'owner-1', updateInput())).rejects.toEqual(
        new AppError(ERROR_CODES.NOT_FOUND, 'Business not found', 404),
      );
      expect(repo.updateForOwner).not.toHaveBeenCalled();
    });

    it('updates the business when the owner owns it', async () => {
      const stored = prismaBusiness({
        name: 'Shop v2',
        defaultTaxRate: decimal(15),
        lowStockDefaultThreshold: decimal(10),
      });
      vi.mocked(repo.getForOwner).mockResolvedValue(prismaBusiness() as never);
      vi.mocked(repo.updateForOwner).mockResolvedValue(stored as never);

      const result = await service.updateBusiness(
        'b-1',
        'owner-1',
        updateInput({ name: 'Shop v2' }),
      );

      expect(repo.updateForOwner).toHaveBeenCalledWith('b-1', updateInput({ name: 'Shop v2' }));
      expect(result).toMatchObject({
        name: 'Shop v2',
        defaultTaxRate: 15,
        lowStockDefaultThreshold: 10,
      });
    });
  });
});
