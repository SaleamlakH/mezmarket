import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';
import { UnitRole, AttachmentRecordType } from '../../../generated/prisma/client.js';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import type {
  CreateProductInput,
  CreateProductRepoResult,
  ProductRepository,
} from './products.types.js';

export function createProductsRepository(prisma: PrismaClient): ProductRepository {
  return {
    async list(businessId: string, branchId: string) {
      return prisma.product.findMany({
        where: { businessId, branchId, active: true },
        orderBy: { createdAt: 'desc' },
      });
    },

    async getById(id: string, businessId: string) {
      return prisma.product.findFirst({ where: { id, businessId } });
    },

    async createForBusiness(
      businessId: string,
      branchId: string,
      input: CreateProductInput,
    ): Promise<CreateProductRepoResult> {
      return prisma.$transaction(async (tx) => {
        const productPromise = tx.product.create({
          data: {
            businessId,
            branchId,
            name: input.name,
            ...(input.brand != null && { brand: input.brand }),
            ...(input.description != null && { description: input.description }),
            ...(input.categoryId != null && { categoryId: input.categoryId }),
            ...(input.lowStockThreshold != null && {
              lowStockThreshold: input.lowStockThreshold,
            }),
            ...(input.trackAsPartial === true && { trackAsPartial: input.trackAsPartial }),
          },
        });

        const baseLookupPromise = tx.standardUnit.findUnique({
          where: { id: input.baseUnit.unitId },
        });

        const mouLookupPromise = input.mou
          ? tx.standardUnit.findUnique({ where: { id: input.mou.unitId } })
          : Promise.resolve(null);

        const product = await productPromise;

        const [createdBaseUnit, createdMou] = await Promise.all([
          // resolve base  standard unit and create base unit
          (async () => {
            const baseStandardUnit = await baseLookupPromise;

            if (!baseStandardUnit) {
              throw new AppError(ERROR_CODES.BAD_REQUEST, 'Base unit not found', 400);
            }

            return tx.productUnit.create({
              data: {
                productId: product.id,
                unitRole: UnitRole.BASE,
                standardUnitId: baseStandardUnit.id,
                name: baseStandardUnit.symbol,
                dependsOn: null,
                conversionRate: null,
                price: input.baseUnit.price,
                purchaseCapable: true,
                sellCapable: true,
              },
            });
          })(),

          // resolve mou standard unit and create mou
          (async () => {
            const mouStandardUnit = await mouLookupPromise;

            if (mouStandardUnit && input.mou) {
              return tx.productUnit.create({
                data: {
                  productId: product.id,
                  unitRole: UnitRole.MOU,
                  standardUnitId: mouStandardUnit.id,
                  name: mouStandardUnit.symbol,
                  dependsOn: 'BASE',
                  conversionRate: input.mou.conversionRate,
                  ...(input.mou.price !== undefined && { price: input.mou.price }),
                  purchaseCapable: false,
                  sellCapable: true,
                },
              });
            }

            return null;
          })(),
        ]);

        const attachment = input.uploadId
          ? await tx.attachment.create({
              data: {
                uploadId: input.uploadId,
                recordType: AttachmentRecordType.PRODUCT,
                recordId: product.id,
              },
            })
          : null;

        const units = createdMou ? [createdBaseUnit, createdMou] : [createdBaseUnit];

        return { ...product, units, attachment };
      });
    },
  };
}
