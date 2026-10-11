import type {
  CreateSaleInput,
  ProductSellContext,
  ProductUnitSellContext,
  ResolvedSaleLine,
  SaleDetailResult,
  SaleRecordSummary,
  SaleRecordWithDetail,
  SaleRepository,
  SaleService,
  SaleSummaryResult,
} from './sales.types.js';
import type { Actor, Scope } from '../../shared/types/session.types.js';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';
import { resolveToStandard, snapshotLines } from '../../shared/utils/snapshot.js';

/** Money is kept at the `Decimal(10, 2)` the columns store. */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function createSaleService(repository: SaleRepository): SaleService {
  return {
    async createSale(actor: Actor, input: CreateSaleInput): Promise<SaleDetailResult> {
      if (input.initialPayment) {
        throw new AppError(
          ERROR_CODES.BAD_REQUEST,
          'Recording an initial payment is not supported yet',
          400,
          { initialPayment: 'An initial payment cannot be recorded yet' },
        );
      }

      const taxConfig = await repository.getBusinessTaxConfig(actor.businessId);

      if (!taxConfig) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Business not found', 404);
      }

      const productIds = [...new Set(input.lines.map((line) => line.productId))];
      const products = await repository.getProductSellContext(actor.businessId, productIds);
      const lines = snapshotSaleLines(products, actor.businessId, input.lines);

      const taxRateApplied = taxConfig.defaultTaxRate?.toNumber() ?? 0;
      const subtotal = roundMoney(
        lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
      );
      const taxAmount = roundMoney(subtotal * taxRateApplied);
      const total = roundMoney(subtotal + taxAmount);

      const record = await repository.createSale({
        businessId: actor.businessId,
        branchId: actor.branchId,
        memberId: actor.memberId,
        saleDatetime: input.saleDatetime ?? new Date(),
        // Nothing here captures a discount yet; the column stays empty.
        discount: null,
        taxRateApplied,
        subtotal,
        taxAmount,
        total,
        lines,
      });

      return toSaleDetail(record);
    },

    async listSales({ businessId, branchId }: Scope) {
      const records = await repository.listSales(businessId, branchId);
      return records.map(toSaleSummary);
    },
  };
}

/**
 * The sale snapshot: the shared catalog walk bound to the sale line resolver,
 * which is where a sale line differs from any other line.
 */
function snapshotSaleLines(
  products: ProductSellContext[],
  businessId: string,
  lines: CreateSaleInput['lines'],
): ResolvedSaleLine[] {
  return snapshotLines(products, businessId, lines, snapshotSaleLine);
}

/** The sale-only part of a line: which unit was sold and at what price. */
function snapshotSaleLine(
  product: ProductSellContext,
  line: CreateSaleInput['lines'][number],
): ResolvedSaleLine {
  const unit = requireSellableUnit(line, product);
  const unitPrice = requireSellingPrice(unit);
  const standard = resolveToStandard(line.quantity, unit, product.productUnits);

  return {
    productId: product.id,
    productName: product.name,
    productUnitId: unit.id,
    soldUnit: unit.name,
    quantity: line.quantity,
    standardUnit: standard.symbol,
    quantityInStandardUnit: standard.quantity,
    resolvedStandardUnitId: standard.id,
    unitPrice,
  };
}

function requireSellableUnit(
  line: CreateSaleInput['lines'][number],
  product: ProductSellContext,
): ProductUnitSellContext {
  const unit = product.productUnits.find((candidate) => candidate.id === line.productUnitId);

  if (!unit) {
    throw new AppError(
      ERROR_CODES.BAD_REQUEST,
      'The selected unit does not belong to this product',
      400,
      { productUnitId: 'This unit does not belong to the product' },
    );
  }

  if (!unit.sellCapable) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'The selected unit cannot be sold', 400, {
      productUnitId: 'This unit cannot be sold',
    });
  }

  return unit;
}

/** The price a unit sells at, snapshotted onto the line. A unit without one cannot be sold. */
function requireSellingPrice(unit: ProductUnitSellContext): number {
  const unitPrice = unit.price?.toNumber();

  if (unitPrice == null) {
    throw new AppError(ERROR_CODES.BAD_REQUEST, 'The selected unit carries no price', 400, {
      productUnitId: 'This unit has no price',
    });
  }

  return unitPrice;
}

/** A stored sale narrowed to the wire contract, decimals and relations flattened in. */
function toSaleDetail(record: SaleRecordWithDetail): SaleDetailResult {
  const { lines, payments, processedByMember, serverMember, customer, ...sale } = record;

  return {
    ...sale,
    discount: sale.discount?.toNumber() ?? null,
    taxRateApplied: sale.taxRateApplied.toNumber(),
    subtotal: sale.subtotal.toNumber(),
    taxAmount: sale.taxAmount.toNumber(),
    total: sale.total.toNumber(),
    amountPaid: sale.amountPaid.toNumber(),
    balanceDue: sale.balanceDue.toNumber(),
    lines: lines.map(({ product, quantity, quantityInStandardUnit, unitPrice, ...line }) => ({
      ...line,
      quantity: quantity.toNumber(),
      quantityInStandardUnit: quantityInStandardUnit.toNumber(),
      unitPrice: unitPrice.toNumber(),
      productBrand: product.brand,
    })),
    payments: payments.map(({ amount, ...payment }) => ({
      ...payment,
      amount: amount.toNumber(),
    })),
    processedBy: processedByMember,
    servedBy: serverMember,
    customer: customer ? { id: customer.id, name: customer.name } : null,
  };
}

/**
 * A stored sale narrowed to a history row: the header fields, the number of
 * lines it holds, and the distinct products it sold. It is deliberately not a
 * detail read — no lines, payments or unit prices travel with it.
 */
function toSaleSummary(record: SaleRecordSummary): SaleSummaryResult {
  return {
    id: record.id,
    invoiceNumber: record.invoiceNumber,
    saleDatetime: record.saleDatetime,
    total: record.total.toNumber(),
    paymentStatus: record.paymentStatus,
    voidStatus: record.voidStatus,
    itemCount: record.lines.length,
    productNames: [...new Set(record.lines.map((line) => line.productName))],
    processedBy: record.processedByMember,
    servedBy: record.serverMember,
    customer: record.customer ? { id: record.customer.id, name: record.customer.name } : null,
  };
}
