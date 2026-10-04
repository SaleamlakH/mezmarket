import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createProductRepository } from '../products.repository.js';
import type { PrismaClient } from '../../../../generated/prisma/client.js';

function createPrismaStub() {
  const product = { findMany: vi.fn(), findFirst: vi.fn() };
  const prisma = { product } as unknown as PrismaClient;
  return { prisma, product };
}

describe('products.repository', () => {
  let prismaStub: ReturnType<typeof createPrismaStub>;
  let repository: ReturnType<typeof createProductRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaStub = createPrismaStub();
    repository = createProductRepository(prismaStub.prisma);
  });

  describe('listProducts', () => {
    it('scopes the query to the business and branch together', async () => {
      prismaStub.product.findMany.mockResolvedValue([]);

      await repository.listProducts('b-1', 'br-1');

      expect(prismaStub.product.findMany).toHaveBeenCalledWith({
        where: { businessId: 'b-1', branchId: 'br-1' },
        include: {
          productUnits: { where: { unitRole: 'BASE' }, take: 1 },
        },
        orderBy: { name: 'asc' },
      });
    });

    it('returns the rows the database produced', async () => {
      const rows = [{ id: 'p-1', productUnits: [{ name: 'Bottle' }] }];
      prismaStub.product.findMany.mockResolvedValue(rows as never);

      await expect(repository.listProducts('b-1', 'br-1')).resolves.toBe(rows);
    });
  });

  describe('getProductWithUnits', () => {
    it('scopes by business inside the query so a foreign product cannot be read', async () => {
      prismaStub.product.findFirst.mockResolvedValue(null);

      await repository.getProductWithUnits('b-1', 'p-1');

      expect(prismaStub.product.findFirst).toHaveBeenCalledWith({
        where: { id: 'p-1', businessId: 'b-1' },
        include: { productUnits: true },
      });
    });

    it('reports an unknown product as null', async () => {
      prismaStub.product.findFirst.mockResolvedValue(null);

      await expect(repository.getProductWithUnits('b-1', 'nope')).resolves.toBeNull();
    });

    it('returns the product it found', async () => {
      const found = { id: 'p-1', productUnits: [] };
      prismaStub.product.findFirst.mockResolvedValue(found as never);

      await expect(repository.getProductWithUnits('b-1', 'p-1')).resolves.toBe(found);
    });
  });
});
