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
} from './products.types.js';

function toProduct(record: ProductRecordWithAttachments): Product {
  const { attachments, ...rest } = record;
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

export function createProductsService(repository: ProductRepository): ProductService {
  return {
    async listProducts(
      businessId: string | undefined,
      branchId: string | undefined,
    ): Promise<Product[]> {
      const { businessId: b, branchId: br } = requireScope(businessId, branchId);
      const records = await repository.list(b, br);

      if (records.length === 0) return [];

      const attachments = await repository.listAttachmentsForProducts(
        records.map((record) => record.id),
      );

      const attachmentsByProductId = new Map<string, typeof attachments>();
      for (const attachment of attachments) {
        const existing = attachmentsByProductId.get(attachment.recordId);
        if (existing) {
          existing.push(attachment);
        } else {
          attachmentsByProductId.set(attachment.recordId, [attachment]);
        }
      }

      return records.map((record) =>
        toProduct({ ...record, attachments: attachmentsByProductId.get(record.id) ?? [] }),
      );
    },

    async getProduct(
      id: string | undefined,
      businessId: string | undefined,
      branchId: string | undefined,
    ): Promise<Product> {
      const { businessId: b } = requireScope(businessId, branchId);
      const record = await repository.getById(requireProductId(id), b);
      if (!record) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Product not found', 404);
      }

      const attachment = await repository.getProductAttachment(record.id);

      return toProduct({
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
  };
}
