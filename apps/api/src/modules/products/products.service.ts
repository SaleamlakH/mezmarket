import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';
import type {
  CreateProductInput,
  CreateProductResult,
  Product,
  ProductRecordWithAttachments,
  ProductRepository,
  ProductService,
  ProductUnit,
  ProductUnitRecord,
  ProductWithUnits,
  ProductSummary,
  ProductUnitOption,
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

export function createProductsService(repository: ProductRepository): ProductService {
  return {
    async listProducts({ businessId, branchId }): Promise<ProductSummary[]> {
      const products = await repository.listForBusiness(businessId, branchId);

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

      return {
        ...toProduct({
          ...record,
          attachments: attachment ? [attachment] : [],
        }),
        units: record.productUnits.map(toUnit),
      };
    },

    async createProduct(
      businessId: string | undefined,
      branchId: string | undefined,
      input: CreateProductInput,
    ): Promise<CreateProductResult> {
      const { businessId: b, branchId: br } = requireScope(businessId, branchId);
      const result = await repository.createForBusiness(b, br, input);
      const { attachment, units, ...productRecord } = result;
      const product = toProduct({
        ...productRecord,
        attachments: attachment ? [attachment] : [],
      });
      return {
        ...product,
        units: units.map(toUnit),
      };
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

    async resolveUploadIds(
      businessId: string | undefined,
      branchId: string | undefined,
    ): Promise<string[]> {
      const { businessId: b, branchId: br } = requireScope(businessId, branchId);
      const records = await repository.listForBusiness(b, br);
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
