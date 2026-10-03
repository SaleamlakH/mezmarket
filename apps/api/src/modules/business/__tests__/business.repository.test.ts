import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBusinessRepository } from '../business.repository.js';
import type { BusinessRepository, UpdateBusinessInput } from '../business.types.js';
import { TaxDisplayMode, type PrismaClient } from '../../../../generated/prisma/client.js';

type MockTx = {
  business: {
    create: ReturnType<typeof vi.fn>;
  };
  branch: {
    create: ReturnType<typeof vi.fn>;
  };
  businessMember: {
    create: ReturnType<typeof vi.fn>;
  };
};

function createPrismaStub() {
  const tx: MockTx = {
    business: { create: vi.fn() },
    branch: { create: vi.fn() },
    businessMember: { create: vi.fn() },
  };
  const business = { findMany: vi.fn(), findFirst: vi.fn(), update: vi.fn() };
  const branch = { findFirst: vi.fn() };
  const businessMember = { findFirst: vi.fn() };
  const $transaction = vi.fn((cb: (tx: MockTx) => unknown) => cb(tx));

  const prisma = { business, branch, businessMember, $transaction } as unknown as PrismaClient;

  return { prisma, tx, business, branch, businessMember, $transaction };
}

function registerSuccess(tx: MockTx) {
  tx.business.create.mockResolvedValue({ id: 'b-1' });
  tx.branch.create.mockResolvedValue({ id: 'br-1' });
  tx.businessMember.create.mockResolvedValue({ id: 'm-1' });
}

describe('business.repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an object implementing BusinessRepository', () => {
    const { prisma } = createPrismaStub();
    const repo = createBusinessRepository(prisma) satisfies BusinessRepository;

    expect(typeof repo.listForOwner).toBe('function');
    expect(typeof repo.createForOwner).toBe('function');
    expect(typeof repo.getBusinessId).toBe('function');
    expect(typeof repo.getBranchId).toBe('function');
    expect(typeof repo.getActor).toBe('function');
  });

  describe('getActor', () => {
    it('looks the member up by business and owner, taking only active ones', async () => {
      const { prisma, businessMember } = createPrismaStub();
      const repo = createBusinessRepository(prisma);

      await repo.getActor('b-1', 'owner-1');

      expect(businessMember.findFirst).toHaveBeenCalledWith({
        where: { businessId: 'b-1', ownerId: 'owner-1', active: true },
        select: { id: true, role: true },
      });
    });

    it('returns null when no active member resolves', async () => {
      const { prisma, businessMember } = createPrismaStub();
      const repo = createBusinessRepository(prisma);
      businessMember.findFirst.mockResolvedValue(null);

      await expect(repo.getActor('b-1', 'owner-1')).resolves.toBeNull();
    });

    it('returns the member id and role as stored', async () => {
      const { prisma, businessMember } = createPrismaStub();
      const repo = createBusinessRepository(prisma);
      businessMember.findFirst.mockResolvedValue({ id: 'm-1', role: 'MANAGER' });

      await expect(repo.getActor('b-1', 'owner-1')).resolves.toEqual({
        id: 'm-1',
        role: 'MANAGER',
      });
    });
  });

  describe('listForOwner', () => {
    it('calls findMany with the owner id and ascending creation order', async () => {
      const { prisma, business } = createPrismaStub();
      const repo = createBusinessRepository(prisma);

      await repo.listForOwner('owner-1');

      expect(business.findMany).toHaveBeenCalledWith({
        where: { ownerId: 'owner-1' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('returns exactly the businesses resolved by findMany', async () => {
      const { prisma, business } = createPrismaStub();
      const repo = createBusinessRepository(prisma);

      const businesses = [{ id: 'b-1' }, { id: 'b-2' }];
      business.findMany.mockResolvedValue(businesses);

      const result = await repo.listForOwner('owner-1');

      expect(result).toEqual(businesses);
    });
  });

  describe('createForOwner', () => {
    it('runs the creates inside a transaction', async () => {
      const { prisma, tx, $transaction } = createPrismaStub();
      const repo = createBusinessRepository(prisma);
      registerSuccess(tx);

      await repo.createForOwner('owner-1', { name: 'Test', currencyCode: 'USD' });

      expect($transaction).toHaveBeenCalledTimes(1);
    });

    it('creates the business with owner id, name, currency code', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createBusinessRepository(prisma);
      registerSuccess(tx);

      await repo.createForOwner('owner-1', { name: 'Test', currencyCode: 'USD' });

      expect(tx.business.create).toHaveBeenCalledWith({
        data: { ownerId: 'owner-1', name: 'Test', currencyCode: 'USD' },
      });
    });

    it('exclude taxDisplayMode if not provided', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createBusinessRepository(prisma);
      registerSuccess(tx);

      await repo.createForOwner('owner-1', {
        name: 'Test',
        currencyCode: 'USD',
      });

      expect(tx.business.create).toHaveBeenCalledWith({
        data: {
          ownerId: 'owner-1',
          name: 'Test',
          currencyCode: 'USD',
        },
      });
    });

    it('includes zero-valued optional numeric fields', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createBusinessRepository(prisma);
      registerSuccess(tx);

      await repo.createForOwner('owner-1', {
        name: 'Test',
        currencyCode: 'USD',
        defaultTaxRate: 0,
        taxDisplayMode: 'EXCLUSIVE',
        lowStockDefaultThreshold: 0,
      });

      expect(tx.business.create).toHaveBeenCalledWith({
        data: {
          ownerId: 'owner-1',
          name: 'Test',
          currencyCode: 'USD',
          defaultTaxRate: 0,
          taxDisplayMode: 'EXCLUSIVE',
          lowStockDefaultThreshold: 0,
        },
      });
    });

    it('creates the main branch linked to the business id (relies on schema default name)', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createBusinessRepository(prisma);
      registerSuccess(tx);

      await repo.createForOwner('owner-1', { name: 'Test', currencyCode: 'USD' });

      expect(tx.branch.create).toHaveBeenCalledWith({
        data: { businessId: 'b-1' },
      });
    });

    it('creates the owner member with name "me", OWNER role and linked ids', async () => {
      const { prisma, tx } = createPrismaStub();
      const repo = createBusinessRepository(prisma);
      registerSuccess(tx);

      await repo.createForOwner('owner-1', { name: 'Test', currencyCode: 'USD' });

      expect(tx.businessMember.create).toHaveBeenCalledWith({
        data: {
          businessId: 'b-1',
          branchId: 'br-1',
          ownerId: 'owner-1',
          name: 'me',
          role: 'OWNER',
        },
      });
    });
  });

  describe('getBusinessId', () => {
    it('returns the business id when it is owned', async () => {
      const { prisma, business } = createPrismaStub();
      const repo = createBusinessRepository(prisma);
      business.findFirst.mockResolvedValue({ id: 'b-1' });

      const result = await repo.getBusinessId('owner-1', 'b-1');

      expect(business.findFirst).toHaveBeenCalledWith({
        where: { id: 'b-1', ownerId: 'owner-1' },
        select: { id: true },
      });
      expect(result).toBe('b-1');
    });

    it('returns null when the business is not owned', async () => {
      const { prisma, business } = createPrismaStub();
      const repo = createBusinessRepository(prisma);
      business.findFirst.mockResolvedValue(null);

      const result = await repo.getBusinessId('owner-1', 'b-1');
      expect(result).toBeNull();
    });
  });

  describe('getForOwner', () => {
    it('calls findFirst with the business id and owner id', async () => {
      const { prisma, business } = createPrismaStub();
      const repo = createBusinessRepository(prisma);

      await repo.getForOwner('b-1', 'owner-1');

      expect(business.findFirst).toHaveBeenCalledWith({
        where: { id: 'b-1', ownerId: 'owner-1' },
      });
    });

    it('returns the resolved business', async () => {
      const { prisma, business } = createPrismaStub();
      const repo = createBusinessRepository(prisma);

      const record = { id: 'b-1', name: 'Shop' };
      business.findFirst.mockResolvedValue(record);

      const result = await repo.getForOwner('b-1', 'owner-1');

      expect(result).toEqual(record);
    });

    it('returns null when no owned business matches the id', async () => {
      const { prisma, business } = createPrismaStub();
      const repo = createBusinessRepository(prisma);

      business.findFirst.mockResolvedValue(null);

      const result = await repo.getForOwner('b-1', 'owner-1');

      expect(result).toBeNull();
    });
  });

  describe('getBranchId', () => {
    it('returns the main branch id for the business', async () => {
      const { prisma, branch } = createPrismaStub();
      const repo = createBusinessRepository(prisma);
      branch.findFirst.mockResolvedValue({ id: 'br-1' });

      const result = await repo.getBranchId('b-1');

      expect(branch.findFirst).toHaveBeenCalledWith({
        where: { businessId: 'b-1' },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      expect(result).toBe('br-1');
    });

    it('returns null when the business has no branch yet', async () => {
      const { prisma, branch } = createPrismaStub();
      const repo = createBusinessRepository(prisma);
      branch.findFirst.mockResolvedValue(null);

      const result = await repo.getBranchId('b-1');

      expect(result).toBeNull();
    });
  });

  describe('updateForOwner', () => {
    const businessUpdateInput = {
      name: 'Shop v2',
      currencyCode: 'USD',
      defaultTaxRate: 15,
      taxDisplayMode: TaxDisplayMode.INCLUSIVE,
      allowNegativeStock: false,
      lowStockDefaultThreshold: 10,
    };

    function updateInput(overrides: Partial<UpdateBusinessInput> = {}): UpdateBusinessInput {
      return {
        ...businessUpdateInput,
        ...overrides,
      };
    }

    it('updates the business with all editable fields', async () => {
      const { prisma, business } = createPrismaStub();
      const repo = createBusinessRepository(prisma);

      business.update.mockResolvedValue({ id: 'b-1' });

      await repo.updateForOwner('b-1', updateInput());

      expect(business.update).toHaveBeenCalledWith({
        where: { id: 'b-1' },
        data: businessUpdateInput,
      });
    });

    it('returns the updated business', async () => {
      const { prisma, business } = createPrismaStub();
      const repo = createBusinessRepository(prisma);

      const updated = { id: 'b-1', name: 'Shop v2' };
      business.update.mockResolvedValue(updated);

      const result = await repo.updateForOwner('b-1', updateInput());

      expect(result).toEqual(updated);
    });
  });
});
