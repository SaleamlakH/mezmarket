import type { AttentionDraftBatches, AttentionUnpaid } from '@mez/types';
import { roundMoney } from '../../../shared/utils/rounding.js';
import type {
  BalanceAggregate,
  CashAggregate,
  CashFigures,
  DraftBatchAggregate,
  SalesAggregate,
  SalesFigures,
  UnpaidAggregate,
} from '../dashboard.types.js';

/** Converts a stored sales aggregate to numbers; missing sums read as zero. */
export function toSalesFigures(row: SalesAggregate): SalesFigures {
  return {
    total: row.total?.toNumber() ?? 0,
    taxAmount: row.taxAmount?.toNumber() ?? 0,
    count: row.count,
  };
}

/** Converts a stored cash aggregate to numbers; a missing sum reads as zero. */
export function toCashFigures(row: CashAggregate): CashFigures {
  return { total: row.total?.toNumber() ?? 0, count: row.count };
}

/** A sales total and count rounded for the wire. */
export function toSalesResponse(sales: SalesFigures): { total: number; count: number } {
  return { total: roundMoney(sales.total), count: sales.count };
}

/** A cash total and payment count rounded for the wire. */
export function toCashResponse(cash: CashFigures): { total: number; paymentCount: number } {
  return { total: roundMoney(cash.total), paymentCount: cash.count };
}

/** A stored balance aggregate with its money rounded. */
export function toBalance({ total, count }: BalanceAggregate): { total: number; count: number } {
  return { total: roundMoney(total?.toNumber() ?? 0), count };
}

/** Every unpaid balance plus the overdue slice, ready for the attention card. */
export function toUnpaid(unpaid: UnpaidAggregate): AttentionUnpaid {
  const all = toBalance(unpaid.all);

  return { count: all.count, total: all.total, overdue: toBalance(unpaid.overdue) };
}

/** Every unpaid balance plus the overdue slice, ready for the summary. */
export function toOutstanding(unpaid: UnpaidAggregate): {
  total: number;
  count: number;
  overdue: { total: number; count: number };
} {
  return {
    total: toBalance(unpaid.all).total,
    count: unpaid.all.count,
    overdue: toBalance(unpaid.overdue),
  };
}

/** The oldest draft batch, with its creation time serialized. */
export function toDraftBatches({ count, oldest }: DraftBatchAggregate): AttentionDraftBatches {
  return {
    count,
    oldest: oldest
      ? {
          batchId: oldest.batchId,
          supplierName: oldest.supplierName,
          createdAt: oldest.createdAt.toISOString(),
          lineCount: oldest.lineCount,
        }
      : null,
  };
}
