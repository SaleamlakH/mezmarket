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
        include: {
          productUnits: { orderBy: [{ unitRole: 'asc' }, { createdAt: 'asc' }] },
        },
      });
    },

    async getById(id: string, businessId: string) {
      return prisma.product.findFirst({
        where: { id, businessId },
        include: {
          productUnits: { orderBy: [{ unitRole: 'asc' }, { createdAt: 'asc' }] },
        },
      });
    },

    async listAttachmentsForProducts(productIds: string[]) {
      return prisma.attachment.findMany({
        where: {
          recordType: AttachmentRecordType.PRODUCT,
          recordId: { in: productIds },
          deletedAt: null,
        },
      });
    },

    async getProductAttachment(productId: string) {
      return prisma.attachment.findFirst({
        where: { recordType: AttachmentRecordType.PRODUCT, recordId: productId, deletedAt: null },
      });
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

        const baseLookupResult = await baseLookupPromise;

        if (!baseLookupResult) {
          throw new AppError(ERROR_CODES.BAD_REQUEST, 'Base unit not found', 400);
        }

        const mouLookupResult = await mouLookupPromise;

        if (input.mou && !mouLookupResult) {
          throw new AppError(ERROR_CODES.BAD_REQUEST, 'MOU unit not found', 400);
        }

        if (mouLookupResult && mouLookupResult.dimensionId === baseLookupResult.dimensionId) {
          throw new AppError(
            ERROR_CODES.BAD_REQUEST,
            'MOU must be in a different dimension from the base unit',
            400,
          );
        }

        const [createdBaseUnit, createdMou] = await Promise.all([
          // create base unit from the resolved standard unit
          tx.productUnit.create({
            data: {
              productId: product.id,
              unitRole: UnitRole.BASE,
              standardUnitId: baseLookupResult.id,
              name: baseLookupResult.symbol,
              dependsOn: null,
              conversionRate: null,
              price: input.baseUnit.price,
              purchaseCapable: true,
              sellCapable: true,
            },
          }),

          // create mou unit when the payload and standard unit resolve
          input.mou && mouLookupResult
            ? tx.productUnit.create({
                data: {
                  productId: product.id,
                  unitRole: UnitRole.MOU,
                  standardUnitId: mouLookupResult.id,
                  name: mouLookupResult.symbol,
                  dependsOn: 'BASE',
                  conversionRate: input.mou.conversionRate,
                  ...(input.mou.price !== undefined && { price: input.mou.price }),
                  purchaseCapable: false,
                  sellCapable: true,
                },
              })
            : Promise.resolve(null),
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
