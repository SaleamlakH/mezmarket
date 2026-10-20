import { AttachmentRecordType, UnitRole } from '../../../generated/prisma/client.js';
import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js';
import type {
  CreateProductRepoResult,
  ProductRepository,
  ProductUnitUpdate,
  ProductUnitWrite,
  UpdateProductRepoResult,
} from './products.types.js';

async function loadProductDetails(
  tx: Prisma.TransactionClient,
  productId: string,
): Promise<UpdateProductRepoResult> {
  const [product, attachments] = await Promise.all([
    tx.product.findFirst({
      where: { id: productId },
      include: { productUnits: true },
    }),
    tx.attachment.findMany({
      where: {
        recordType: AttachmentRecordType.PRODUCT,
        recordId: productId,
        deletedAt: null,
      },
    }),
  ]);

  if (!product) {
    throw new Error(`Product ${productId} not found`);
  }

  return { ...product, attachments };
}

export function createProductsRepository(prisma: PrismaClient): ProductRepository {
  return {
    async listForBusiness(businessId, branchId, filters) {
      return await prisma.product.findMany({
        where: {
          businessId,
          branchId,
          ...(filters.status === 'active' && { active: true }),
          ...(filters.status === 'inactive' && { active: false }),
        },
        include: {
          productUnits: { where: { unitRole: 'BASE' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
      });
    },

    async getByIdWithUnits(id, businessId) {
      return await prisma.product.findFirst({
        where: { id, businessId },
        include: { productUnits: true },
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

    async findStandardUnits(ids: string[]) {
      return prisma.standardUnit.findMany({ where: { id: { in: ids } } });
    },

    async createProduct({
      businessId,
      branchId,
      product: input,
      baseStandardUnit,
      mouStandardUnit,
    }): Promise<CreateProductRepoResult> {
      const customUnits = input.customUnits ?? [];

      return await prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
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

        const [createdBaseUnit, createdMou] = await Promise.all([
          tx.productUnit.create({
            data: {
              productId: product.id,
              unitRole: UnitRole.BASE,
              standardUnitId: baseStandardUnit.id,
              name: baseStandardUnit.name,
              dependsOn: null,
              conversionRate: null,
              price: input.baseUnit.price,
              purchaseCapable: true,
              sellCapable: true,
            },
          }),

          input.mou && mouStandardUnit
            ? tx.productUnit.create({
                data: {
                  productId: product.id,
                  unitRole: UnitRole.MOU,
                  standardUnitId: mouStandardUnit.id,
                  name: mouStandardUnit.name,
                  dependsOn: 'BASE',
                  conversionRate: input.mou.conversionRate,
                  ...(input.mou.price !== undefined && { price: input.mou.price }),
                  purchaseCapable: false,
                  sellCapable: true,
                },
              })
            : Promise.resolve(null),
        ]);

        const createdCustomUnits = await Promise.all(
          customUnits.map((unit) =>
            tx.productUnit.create({
              data: {
                productId: product.id,
                unitRole: UnitRole.CUSTOM,
                standardUnitId: null,
                name: unit.name,
                dependsOn: unit.dependsOn,
                conversionRate: unit.conversionRate,
                ...(unit.sellCapable && { price: unit.price }),
                purchaseCapable: unit.purchaseCapable,
                sellCapable: unit.sellCapable,
              },
            }),
          ),
        );

        const attachment = input.uploadId
          ? await tx.attachment.create({
              data: {
                uploadId: input.uploadId,
                recordType: AttachmentRecordType.PRODUCT,
                recordId: product.id,
              },
            })
          : null;

        const units = [createdBaseUnit, ...(createdMou ? [createdMou] : []), ...createdCustomUnits];

        return { ...product, units, attachment };
      });
    },

    async createUnit(data: ProductUnitWrite): Promise<UpdateProductRepoResult> {
      return await prisma.$transaction(async (tx) => {
        await tx.productUnit.create({ data });
        return loadProductDetails(tx, data.productId);
      });
    },

    async updateUnits(
      productId: string,
      writes: ProductUnitUpdate[],
    ): Promise<UpdateProductRepoResult> {
      return await prisma.$transaction(async (tx) => {
        for (const write of writes) {
          await tx.productUnit.update({
            where: { id: write.id },
            data: {
              ...(write.name !== undefined && { name: write.name }),
              ...(write.price !== undefined && { price: write.price }),
              ...(write.purchaseCapable !== undefined && {
                purchaseCapable: write.purchaseCapable,
              }),
              ...(write.sellCapable !== undefined && { sellCapable: write.sellCapable }),
            },
          });
        }

        return loadProductDetails(tx, productId);
      });
    },

    async updateProduct(productId, input): Promise<UpdateProductRepoResult> {
      return await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: productId },
          data: {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.brand !== undefined && { brand: input.brand }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
            ...(input.lowStockThreshold !== undefined && {
              lowStockThreshold: input.lowStockThreshold,
            }),
            ...(input.trackAsPartial !== undefined && { trackAsPartial: input.trackAsPartial }),
          },
        });

        return loadProductDetails(tx, productId);
      });
    },

    async setActive(productId, active): Promise<UpdateProductRepoResult> {
      return await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: productId },
          data: { active },
        });

        return loadProductDetails(tx, productId);
      });
    },
  };
}
