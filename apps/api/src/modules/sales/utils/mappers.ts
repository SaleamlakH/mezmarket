import type {
  SaleDetailResult,
  SaleSummaryResult,
  SaleRecordSummary,
  SaleRecordWithDetail,
} from '../sales.types.js';

/** A stored sale narrowed to the wire contract, decimals and relations flattened in. */
export function toSaleDetail(record: SaleRecordWithDetail): SaleDetailResult {
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
export function toSaleSummary(record: SaleRecordSummary): SaleSummaryResult {
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
