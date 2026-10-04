import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { ProductRepository } from './products.types.js';

export function createProductRepository(prisma: PrismaClient): ProductRepository {
  return {
    async listProducts(businessId, branchId) {
      return await prisma.product.findMany({
        where: { businessId, branchId },
        include: {
          productUnits: { where: { unitRole: 'BASE' }, take: 1 },
        },
        orderBy: { name: 'asc' },
      });
    },

    async getProductWithUnits(businessId, productId) {
      const product = await prisma.product.findFirst({
        where: { id: productId, businessId },
        include: { productUnits: true },
      });

      return product;
    },
  };
}
