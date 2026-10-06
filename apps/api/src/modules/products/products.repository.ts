import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';
import { UnitRole, AttachmentRecordType, Prisma } from '../../../generated/prisma/client.js';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import type {
  CreateProductInput,
  CreateProductRepoResult,
  ProductRepository,
} from './products.types.js';

/**
 * Refuses a request about a specific field, saying the same thing in the envelope's
 * message and in its per-field detail so a client can put the message on the field it
 * belongs to instead of only at the top of the form.
 */
function rejectField(message: string, field: string): never {
  throw new AppError(ERROR_CODES.BAD_REQUEST, message, 400, { [field]: message });
}

/**
 * The one failure the product-unit name index can raise that the checks above did not
 * already catch: two requests racing each other, or a name that collided with a row
 * added between the read and the write. Left alone it would surface as a 500, which
 * tells an owner nothing about the field they got wrong.
 */
function isDuplicateUnitName(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * Unit names are compared the way a person reads them, so `Shot` and `shot ` are the
 * same name and cannot both exist on one product. The database's own index is
 * case-sensitive, so this is the check that actually enforces it.
 */
const sameName = (name: string) => name.trim().toLowerCase();

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
      const customUnits = input.customUnits ?? [];

      try {
        return await prisma.$transaction(async (tx) => {
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

          // A name is only unique per product, and the whole set is checked before any
          // of it is written, so an owner is told about one clash at a time instead of
          // fixing a half-built set of units to find out what else was wrong. The base
          // and content units are named after the standard units' symbols, which is why
          // the shared schema cannot make this call itself.
          const takenNames = new Set([sameName(baseLookupResult.symbol)]);

          if (mouLookupResult) {
            takenNames.add(sameName(mouLookupResult.symbol));
          }

          customUnits.forEach((unit, index) => {
            const name = sameName(unit.name);

            if (takenNames.has(name)) {
              rejectField(
                `This product already has a unit named "${unit.name}"`,
                `customUnits.${index}.name`,
              );
            }

            takenNames.add(name);
          });

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

          // Only a sell-capable unit carries a price, which is what the shared schema
          // established; reading it back through the same flag keeps the two from
          // drifting. A `CUSTOM` row is the one kind with no standard unit behind it —
          // the owner named it — which is why its name is stored as given.
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

          const units = [
            createdBaseUnit,
            ...(createdMou ? [createdMou] : []),
            ...createdCustomUnits,
          ];

          return { ...product, units, attachment };
        });
      } catch (error) {
        // Left without a field, because this is the one clash the check above could
        // not see coming and so cannot say *which* unit it was: naming the first one
        // would point an owner at a row that may have nothing wrong with it.
        if (isDuplicateUnitName(error)) {
          throw new AppError(
            ERROR_CODES.BAD_REQUEST,
            'This product already has a unit with that name',
            400,
          );
        }
        throw error;
      }
    },
  };
}
