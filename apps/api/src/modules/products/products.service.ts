import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';
import { UnitRole } from '../../../generated/prisma/client.js';
import type { StandardUnit as StandardUnitRecord } from '../../../generated/prisma/client.js';
import type {
  CreateProductInput,
  CreateProductResult,
  CreateProductUnitInput,
  CreateProductUnitResult,
  Product,
  ProductRecordWithAttachments,
  ProductRecordWithUnits,
  ProductRepository,
  ProductService,
  ProductUnit,
  ProductUnitRecord,
  ProductUnitUpdate,
  ProductUnitWrite,
  ProductWithUnits,
  ProductSummary,
  ProductUnitOption,
  UpdateProductInput,
  UpdateProductUnitsInput,
  UpdateProductUnitsResult,
  UploadTarget,
} from './products.types.js';

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
    price: unit.price?.toNumber() ?? null,
  };
}

function toProduct(record: ProductRecordWithAttachments): Product {
  const { attachments, productUnits: _productUnits, ...rest } = record;
  void _productUnits;
  return {
    ...rest,
    lowStockThreshold: record.lowStockThreshold?.toNumber() ?? null,
    currentSealedStock: record.currentSealedStock.toNumber(),
    uploadId: attachments?.[0]?.uploadId ?? null,
  };
}

function toUnit(record: ProductUnitRecord): ProductUnit {
  return {
    ...record,
    conversionRate: record.conversionRate?.toNumber() ?? null,
    price: record.price?.toNumber() ?? null,
  };
}

function toProductWithUnits(
  record: ProductRecordWithAttachments & { productUnits: ProductUnitRecord[] },
): ProductWithUnits {
  return {
    ...toProduct(record),
    units: record.productUnits.map(toUnit),
  };
}

function requireScope(
  businessId: string | undefined,
  branchId: string | undefined,
): { businessId: string; branchId: string } {
  if (!businessId || !branchId) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401);
  }
  return { businessId, branchId };
}

function requireProductId(id: string | undefined): string {
  if (!id) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'Missing product id', 400);
  }
  return id;
}

function requireBusinessId(businessId: string | undefined): string {
  if (!businessId) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, 'Unauthorized', 401);
  }
  return businessId;
}

async function requireProduct(
  repository: ProductRepository,
  id: string | undefined,
  businessId: string | undefined,
  branchId: string | undefined,
): Promise<{ productId: string; product: ProductRecordWithUnits }> {
  const { businessId: b } = requireScope(businessId, branchId);
  const productId = requireProductId(id);
  const product = await repository.getByIdWithUnits(productId, b);

  if (!product) {
    throw new AppError(ERROR_CODES.NOT_FOUND, 'Product not found', 404);
  }

  return { productId, product };
}

/**
 * Refuses a request about a specific field, saying the same thing in the envelope's
 * message and in its per-field detail so a client can put the message on the field it
 * belongs to instead of only at the top of the form.
 */
function rejectField(message: string, field: string): never {
  throw new AppError(ERROR_CODES.BAD_REQUEST, message, 400, { [field]: message });
}

/**
 * The one failure the product-unit name index can raise that the checks before the
 * write did not already catch: two requests racing each other. Left alone it would
 * surface as a 500, which tells an owner nothing about the field they got wrong.
 */
function isDuplicateUnitName(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002'
  );
}

/**
 * Unit names are compared the way a person reads them, so `Shot` and `shot ` are the
 * same name and cannot both exist on one product. The database's own index is
 * case-sensitive, so this is the check that actually enforces it.
 */
const sameName = (name: string) => name.trim().toLowerCase();

function unitNameRegistry(units: ProductUnitRecord[]): Map<string, string | null> {
  return new Map(units.map((unit) => [sameName(unit.name), unit.id]));
}

/**
 * Reserves a name for a unit, allowing a unit to keep or recase its own name. A name
 * already held by another unit stays taken for the whole request, even if that unit is
 * renamed in the same request.
 */
function reserveUnitName(
  registry: Map<string, string | null>,
  name: string,
  unitId: string | undefined,
  field: string,
): void {
  const key = sameName(name);
  const ownerId = registry.get(key);

  if (ownerId !== undefined && ownerId !== unitId) {
    rejectField(`This product already has a unit named "${name}"`, field);
  }

  registry.set(key, unitId ?? null);
}

export function createProductsService(repository: ProductRepository): ProductService {
  return {
    async listProducts({ businessId, branchId }, filters): Promise<ProductSummary[]> {
      const products = await repository.listForBusiness(businessId, branchId, filters);

      if (products.length === 0) return [];

      const attachments = await repository.listAttachmentsForProducts(
        products.map((product) => product.id),
      );
      const uploadIds = new Map(
        attachments
          .filter((attachment) => attachment.uploadId != null)
          .map((attachment) => [attachment.recordId, attachment.uploadId]),
      );

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
          uploadId: uploadIds.get(product.id) ?? null,
        };
      });
    },

    async listProductUnits({ businessId }, productId): Promise<ProductUnitOption[]> {
      const product = await repository.getByIdWithUnits(productId, businessId);

      if (!product) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Product not found', 404);
      }

      return product.productUnits
        .map(toUnitOption)
        .sort(
          (a, b) => roleRank(a.unitRole) - roleRank(b.unitRole) || a.name.localeCompare(b.name),
        );
    },

    async getProduct(
      id: string | undefined,
      businessId: string | undefined,
      branchId: string | undefined,
    ): Promise<ProductWithUnits> {
      const { businessId: b } = requireScope(businessId, branchId);
      const record = await repository.getByIdWithUnits(requireProductId(id), b);
      if (!record) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Product not found', 404);
      }

      const attachment = await repository.getProductAttachment(record.id);

      return toProductWithUnits({
        ...record,
        attachments: attachment ? [attachment] : [],
      });
    },

    async createProduct(
      businessId: string | undefined,
      branchId: string | undefined,
      input: CreateProductInput,
    ): Promise<CreateProductResult> {
      const { businessId: b, branchId: br } = requireScope(businessId, branchId);

      const lookupIds = [input.baseUnit.unitId];
      if (input.mou) lookupIds.push(input.mou.unitId);

      const standards = await repository.findStandardUnits(lookupIds);
      const standardById = new Map(standards.map((standard) => [standard.id, standard]));

      const baseStandard = standardById.get(input.baseUnit.unitId);
      if (!baseStandard) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, 'Base unit not found', 400);
      }

      let mouStandard: StandardUnitRecord | undefined;
      if (input.mou) {
        mouStandard = standardById.get(input.mou.unitId);
        if (!mouStandard) {
          throw new AppError(ERROR_CODES.BAD_REQUEST, 'MOU unit not found', 400);
        }
        if (mouStandard.dimensionId === baseStandard.dimensionId) {
          throw new AppError(
            ERROR_CODES.BAD_REQUEST,
            'MOU must be in a different dimension from the base unit',
            400,
          );
        }
      }

      // A name is only unique per product, and the whole set is checked before any of
      // it is written, so an owner is told about one clash at a time instead of fixing
      // a half-built set of units to find out what else was wrong. The base and content
      // units are named after the standard units' symbols, which is why the shared
      // schema cannot make this call itself.
      const takenNames = new Set([sameName(baseStandard.symbol)]);
      if (mouStandard) takenNames.add(sameName(mouStandard.symbol));

      (input.customUnits ?? []).forEach((unit, index) => {
        const name = sameName(unit.name);
        if (takenNames.has(name)) {
          rejectField(
            `This product already has a unit named "${unit.name}"`,
            `customUnits.${index}.name`,
          );
        }
        takenNames.add(name);
      });

      let result;
      try {
        result = await repository.createProduct({
          businessId: b,
          branchId: br,
          product: input,
          baseStandardUnit: { id: baseStandard.id, name: baseStandard.symbol },
          ...(mouStandard && {
            mouStandardUnit: { id: mouStandard.id, name: mouStandard.symbol },
          }),
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

      const { attachment, units, ...productRecord } = result;
      return toProductWithUnits({
        ...productRecord,
        productUnits: units,
        attachments: attachment ? [attachment] : [],
      });
    },

    async createProductUnit(
      id: string | undefined,
      businessId: string | undefined,
      branchId: string | undefined,
      input: CreateProductUnitInput,
    ): Promise<CreateProductUnitResult> {
      const { productId: pid, product } = await requireProduct(
        repository,
        id,
        businessId,
        branchId,
      );
      const unitNames = unitNameRegistry(product.productUnits);
      let write: ProductUnitWrite;

      // The content unit is the same row the create request writes: a standard unit
      // named by its symbol, based on the base unit.
      if (input.unitRole === 'MOU') {
        if (product.productUnits.some((unit) => unit.unitRole === UnitRole.MOU)) {
          rejectField('This product already has a content unit', 'unitRole');
        }

        const contentStandards = await repository.findStandardUnits([input.unitId]);
        const contentStandard = contentStandards.find((standard) => standard.id === input.unitId);
        if (!contentStandard) {
          rejectField('Unit not found', 'unitId');
        }

        const base = product.productUnits.find((unit) => unit.unitRole === UnitRole.BASE);
        const baseStandard = base?.standardUnitId
          ? (await repository.findStandardUnits([base.standardUnitId])).find(
              (standard) => standard.id === base.standardUnitId,
            )
          : undefined;

        // A content unit measures the same product in another dimension — a bottle
        // of `750 ml` — so one from the base's own dimension would be a second base.
        if (baseStandard && baseStandard.dimensionId === contentStandard.dimensionId) {
          rejectField(
            'The content unit must be in a different dimension from the base unit',
            'unitId',
          );
        }

        reserveUnitName(unitNames, contentStandard.symbol, undefined, 'unitId');

        write = {
          productId: pid,
          unitRole: UnitRole.MOU,
          standardUnitId: contentStandard.id,
          name: contentStandard.symbol,
          dependsOn: 'BASE',
          conversionRate: input.conversionRate,
          ...(input.price !== undefined && { price: input.price }),
          purchaseCapable: false,
          sellCapable: true,
        };
      } else {
        if (
          input.dependsOn === 'MOU' &&
          !product.productUnits.some((unit) => unit.unitRole === UnitRole.MOU)
        ) {
          rejectField(
            'Set a content unit first, or base this unit on the base unit instead',
            'dependsOn',
          );
        }

        // Names are compared as a person reads them, and the base and content rows
        // carry their standard units' symbols, so those count as taken too.
        reserveUnitName(unitNames, input.name, undefined, 'name');

        write = {
          productId: pid,
          unitRole: UnitRole.CUSTOM,
          standardUnitId: null,
          name: input.name,
          dependsOn: input.dependsOn,
          conversionRate: input.conversionRate,
          ...(input.sellCapable && { price: input.price }),
          purchaseCapable: input.purchaseCapable,
          sellCapable: input.sellCapable,
        };
      }

      try {
        return toProductWithUnits(await repository.createUnit(write));
      } catch (error) {
        // The read above cannot see a name added between it and the write; the unique
        // index does, and this says the same thing the check would have.
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

    async updateProduct(
      id: string | undefined,
      businessId: string | undefined,
      branchId: string | undefined,
      input: UpdateProductInput,
    ): Promise<ProductWithUnits> {
      const { businessId: b } = requireScope(businessId, branchId);
      const pid = requireProductId(id);

      const existing = await repository.getByIdWithUnits(pid, b);
      if (!existing) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Product not found', 404);
      }

      return toProductWithUnits(await repository.updateProduct(pid, input));
    },

    async updateProductUnits(
      id: string | undefined,
      businessId: string | undefined,
      branchId: string | undefined,
      input: UpdateProductUnitsInput,
    ): Promise<UpdateProductUnitsResult> {
      const { productId: pid, product } = await requireProduct(
        repository,
        id,
        businessId,
        branchId,
      );
      const existing = product.productUnits;
      const existingById = new Map(existing.map((unit) => [unit.id, unit]));
      const unitNames = unitNameRegistry(existing);

      // Only the owner's own units can be renamed or have their capabilities narrowed;
      // a base or content unit's name and role are the platform's, but its selling
      // price is the owner's to set. An id that names no row of this product, or a row
      // whose role does not match the one the payload claims, is a mistake the payload
      // can point at, so it fails the request.
      const writes: ProductUnitUpdate[] = [];

      input.units.forEach((unit, index) => {
        const record = existingById.get(unit.id);

        if (!record) {
          rejectField('Unit not found', `units.${index}.id`);
        }

        if (record.unitRole !== unit.unitRole) {
          rejectField('Unit role does not match the stored unit', `units.${index}.unitRole`);
        }

        if (unit.unitRole === 'CUSTOM') {
          reserveUnitName(unitNames, unit.name, unit.id, `units.${index}.name`);

          const sellCapable = unit.sellCapable ?? record.sellCapable;
          const purchaseCapable = unit.purchaseCapable ?? record.purchaseCapable;
          const changingCapabilities =
            unit.purchaseCapable !== undefined || unit.sellCapable !== undefined;

          // A unit that can neither be bought nor sold is unusable. Only an edit that
          // touches a capability can make one so.
          if (changingCapabilities && !sellCapable && !purchaseCapable) {
            rejectField(
              'A unit must be usable for purchasing or selling',
              `units.${index}.sellCapable`,
            );
          }

          const write: ProductUnitUpdate = { id: unit.id };

          if (unit.name !== undefined && unit.name !== record.name) write.name = unit.name;

          if (changingCapabilities) {
            write.purchaseCapable = purchaseCapable;
            write.sellCapable = sellCapable;
          }

          // The price and the capabilities are independent: narrowing a unit leaves
          // whatever price it had untouched, and only a unit being made sellable is
          // required to have one.
          if (unit.price !== undefined) {
            write.price = unit.price;
          } else if (
            unit.sellCapable === true &&
            (record.price === null || Number(record.price) <= 0)
          ) {
            rejectField('A price is required for a unit you can sell', `units.${index}.price`);
          }

          writes.push(write);
          return;
        }

        if (unit.price !== undefined) {
          // Only the price moves on a platform row; its name is left as it is.
          writes.push({ id: unit.id, price: unit.price });
        }
      });

      let updated;
      try {
        updated = await repository.updateUnits(pid, writes);
      } catch (error) {
        if (isDuplicateUnitName(error)) {
          throw new AppError(
            ERROR_CODES.BAD_REQUEST,
            'This product already has a unit with that name',
            400,
          );
        }
        throw error;
      }

      return toProductWithUnits(updated);
    },

    async setProductActive(
      id: string | undefined,
      businessId: string | undefined,
      branchId: string | undefined,
      active: boolean,
    ): Promise<ProductWithUnits> {
      const { businessId: b } = requireScope(businessId, branchId);
      const pid = requireProductId(id);

      const existing = await repository.getByIdWithUnits(pid, b);
      if (!existing) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Product not found', 404);
      }

      return toProductWithUnits(await repository.setActive(pid, active));
    },

    async resolveUploadId(
      productId: string | undefined,
      businessId: string | undefined,
    ): Promise<string> {
      const b = requireBusinessId(businessId);
      const pid = requireProductId(productId);

      const product = await repository.getByIdWithUnits(pid, b);
      if (!product) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Upload not found', 404);
      }

      const attachment = await repository.getProductAttachment(pid);
      if (!attachment?.uploadId) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Upload not found', 404);
      }

      return attachment.uploadId;
    },

    async resolveUploadTarget(
      productId: string | undefined,
      businessId: string | undefined,
    ): Promise<UploadTarget> {
      const b = requireBusinessId(businessId);
      const pid = requireProductId(productId);

      const [product, attachment] = await Promise.all([
        repository.getByIdWithUnits(pid, b),
        repository.getProductAttachment(pid),
      ]);

      if (!product) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Product not found', 404);
      }

      // A replacement reuses the image the product already shows, so the new bytes
      // land on the same key and the reclaim below just refreshes the claim; a
      // product with no image yet has nothing to reuse.
      return { productId: pid, uploadId: attachment?.uploadId ?? null };
    },

    async resolveUploadIds(
      businessId: string | undefined,
      branchId: string | undefined,
    ): Promise<string[]> {
      const { businessId: b, branchId: br } = requireScope(businessId, branchId);
      // Every product's image, including inactive ones, since the catalog still shows
      // them and each needs a signed link.
      const records = await repository.listForBusiness(b, br, { status: 'all' });
      if (records.length === 0) return [];

      const attachments = await repository.listAttachmentsForProducts(
        records.map((record) => record.id),
      );

      return [
        ...new Set(
          attachments
            .map((attachment) => attachment.uploadId)
            .filter((uploadId): uploadId is string => uploadId != null),
        ),
      ];
    },
  };
}
