import type {
  ProductRepository,
  ProductService,
  ProductSummary,
  ProductUnitOption,
  ProductUnitRecord,
} from './products.types.js';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';

/** Units ordered as Base, MOU, STANDARD, CUSTOM; ties broken by name. */
const ROLE_ORDER = ['BASE', 'MOU', 'STANDARD', 'CUSTOM'] as const;

function roleRank(role: string): number {
  const rank = ROLE_ORDER.indexOf(role as (typeof ROLE_ORDER)[number]);
  return rank === -1 ? ROLE_ORDER.length : rank;
}

function toUnitOption(unit: ProductUnitRecord): ProductUnitOption {
  return {
    id: unit.id,
    productId: unit.productId,
    name: unit.name,
    purchaseCapable: unit.purchaseCapable,
    sellCapable: unit.sellCapable,
    unitRole: unit.unitRole,
    dependsOn: unit.dependsOn,
    conversionRate: unit.conversionRate?.toNumber() ?? null,
  };
}

export function createProductService(repository: ProductRepository): ProductService {
  return {
    async listProducts({ businessId, branchId }): Promise<ProductSummary[]> {
      const products = await repository.listProducts(businessId, branchId);

      return products.map((product) => {
        const baseUnit = product.productUnits[0];

        if (!baseUnit) {
          throw new AppError(
            ERROR_CODES.INTERNAL_ERROR,
            `Product ${product.name} has no base unit`,
            500,
          );
        }

        return {
          id: product.id,
          name: product.name,
          brand: product.brand,
          currentSealedStock: product.currentSealedStock.toNumber(),
          lowStockThreshold: product.lowStockThreshold?.toNumber() ?? null,
          active: product.active,
          baseUnitLabel: baseUnit.name,
        };
      });
    },

    async listProductUnits({ businessId }, productId): Promise<ProductUnitOption[]> {
      const product = await repository.getProductWithUnits(businessId, productId);

      if (!product) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Product not found', 404);
      }

      return product.productUnits
        .map(toUnitOption)
        .sort(
          (a, b) => roleRank(a.unitRole) - roleRank(b.unitRole) || a.name.localeCompare(b.name),
        );
    },
  };
}
