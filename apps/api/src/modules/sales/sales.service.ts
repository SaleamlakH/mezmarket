import type {
  CreateSaleInput,
  ProductSellContext,
  ProductUnitSellContext,
  ResolvedSaleLine,
  SaleDetailResult,
  SaleLineAllocation,
  SaleRecordSummary,
  SaleRecordWithDetail,
  SaleRepository,
  SaleService,
  SaleSummaryResult,
  StockDecrement,
  StockLot,
  StockLotDecrement,
} from './sales.types.js';
import type { Actor, Scope } from '../../shared/types/session.types.js';
import { AppError, ERROR_CODES } from '../../shared/errors/app-error.js';
import {
  convertToStandardQuantity,
  resolveToStandard,
  snapshotLines,
} from '../../shared/utils/snapshot.js';

/** Money is kept at the `Decimal(10, 2)` the columns store. */
function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Quantities are kept at the `Decimal(12, 4)` the columns store. */
function roundQuantity(value: number): number {
  return Math.round(value * 10000) / 10000;
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

      const productIds = [...new Set(input.lines.map((line) => line.productId))];
      const [saleConfig, products, lots] = await Promise.all([
        repository.getBusinessSaleConfig(actor.businessId),
        repository.getProductSellContext(actor.businessId, productIds),
        repository.getStockLots(actor.businessId, productIds),
      ]);

      if (!saleConfig) {
        throw new AppError(ERROR_CODES.NOT_FOUND, 'Business not found', 404);
      }

      const lines = snapshotSaleLines(products, actor.businessId, input.lines);
      const allocated = allocateStock(products, lots, lines, saleConfig.allowNegativeStock);

      const taxRateApplied = saleConfig.defaultTaxRate?.toNumber() ?? 0;
      const subtotal = roundMoney(
        allocated.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
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
        lines: allocated,
        stockDecrements: sumBaseByProduct(allocated),
        lotDecrements: sumDrawsByLot(allocated),
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
  const quantityInBaseUnit = convertToStandardQuantity(
    product.productUnits,
    unit,
    'BASE',
    line.quantity,
  );

  return {
    productId: product.id,
    productName: product.name,
    productUnitId: unit.id,
    soldUnit: unit.name,
    quantity: line.quantity,
    standardUnit: standard.symbol,
    quantityInStandardUnit: standard.quantity,
    quantityInBaseUnit: roundQuantity(quantityInBaseUnit),
    resolvedStandardUnitId: standard.id,
    unitPrice,
    // Filled in once the lots are in hand; nothing may be sold unallocated without
    // going through `allocateStock`.
    allocations: [],
  };
}

/**
 * Draws every line against the lots of its product, oldest first, splitting a
 * line across lots when the oldest runs out. The negative-stock rule is applied
 * before anything is drawn, so a blocked sale is rejected whole.
 */
function allocateStock(
  products: ProductSellContext[],
  lots: StockLot[],
  lines: ResolvedSaleLine[],
  allowNegativeStock: boolean,
): ResolvedSaleLine[] {
  enforceStockPolicy(products, lines, allowNegativeStock);

  const lotsByProduct = groupLotsByProduct(lots);
  // Remaining per lot, in base units, drawn down as the lines are allocated.
  const remaining = new Map(lots.map((lot) => [lot.id, lot.quantityRemaining.toNumber()]));

  return lines.map((line) => ({
    ...line,
    allocations: drawLine(line, lotsByProduct.get(line.productId) ?? [], remaining),
  }));
}

/**
 * Rejects the whole sale when it would take a product's sealed stock below zero
 * and the business does not allow it. The draw is summed per product, because
 * several lines may each be individually fine but together oversell it.
 */
function enforceStockPolicy(
  products: ProductSellContext[],
  lines: ResolvedSaleLine[],
  allowNegativeStock: boolean,
): void {
  if (allowNegativeStock) return;

  for (const { productId, amount } of sumBaseByProduct(lines)) {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) continue;

    if (product.currentSealedStock.toNumber() - amount < 0) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, 'The sale would take stock below zero', 400, {
        productId: `Selling ${product.name} would leave less than no stock`,
      });
    }
  }
}

/** Allocates one line's base quantity against its product's lots, oldest first. */
function drawLine(
  line: ResolvedSaleLine,
  lots: StockLot[],
  remaining: Map<string, number>,
): SaleLineAllocation[] {
  const allocations: SaleLineAllocation[] = [];
  let toDraw = line.quantityInBaseUnit;

  for (const lot of lots) {
    if (toDraw <= 0) break;

    const available = remaining.get(lot.id) ?? 0;
    if (available <= 0) continue;

    const pulled = Math.min(available, toDraw);
    remaining.set(lot.id, available - pulled);
    allocations.push({
      stockBatchLineId: lot.id,
      quantityPulled: roundQuantity(pulled),
      unitCost: lot.purchaseUnitCost.toNumber(),
    });
    toDraw -= pulled;
  }

  // Any quantity left over is an oversell with no lot behind it; the product
  // decrement still reflects it, but no cost row can be written for it.
  return allocations;
}

function groupLotsByProduct(lots: StockLot[]): Map<string, StockLot[]> {
  const grouped = new Map<string, StockLot[]>();

  for (const lot of lots) {
    const list = grouped.get(lot.productId) ?? [];
    list.push(lot);
    grouped.set(lot.productId, list);
  }

  return grouped;
}

/** Sealed stock is counted per product, so lines of one product are summed. */
function sumBaseByProduct(lines: ResolvedSaleLine[]): StockDecrement[] {
  const totals = new Map<string, number>();

  for (const line of lines) {
    totals.set(line.productId, (totals.get(line.productId) ?? 0) + line.quantityInBaseUnit);
  }

  return [...totals].map(([productId, amount]) => ({
    productId,
    amount: roundQuantity(amount),
  }));
}

/** A lot is drawn by every line that reaches it, so its draws are summed. */
function sumDrawsByLot(lines: ResolvedSaleLine[]): StockLotDecrement[] {
  const totals = new Map<string, number>();

  for (const line of lines) {
    for (const allocation of line.allocations) {
      totals.set(
        allocation.stockBatchLineId,
        (totals.get(allocation.stockBatchLineId) ?? 0) + allocation.quantityPulled,
      );
    }
  }

  return [...totals].map(([stockBatchLineId, quantity]) => ({
    stockBatchLineId,
    quantity: roundQuantity(quantity),
  }));
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
