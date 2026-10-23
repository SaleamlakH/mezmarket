import type { DashboardPeriodBucket, TrendPoint } from '@mez/types';
import { roundMoney } from '../../../shared/utils/rounding.js';
import type {
  CostingLot,
  SaleLineTime,
  SalesTimeGroup,
  TrendCostGroup,
} from '../dashboard.types.js';
import { costOf } from './profit.js';

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Builds one gross-profit point per bucket from `from` to `to`. Revenue is total
 * minus tax, cost is pulled quantity at the lot's cost, and every empty bucket
 * is emitted with zero.
 */
export function buildTrendPoints(
  from: Date,
  to: Date,
  bucket: DashboardPeriodBucket,
  salesTimes: SalesTimeGroup[],
  costs: TrendCostGroup[],
  lineMap: SaleLineTime[],
  lots: CostingLot[],
): TrendPoint[] {
  const step = bucket === 'hour' ? MS_PER_HOUR : MS_PER_DAY;
  const bucketCount = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / step));
  const revenue = Array.from({ length: bucketCount }, () => 0);
  const cost = Array.from({ length: bucketCount }, () => 0);

  const bucketIndexOf = (at: Date) => Math.floor((at.getTime() - from.getTime()) / step);

  for (const sale of salesTimes) {
    const index = bucketIndexOf(sale.saleDatetime);

    if (index < 0 || index >= bucketCount) continue;

    revenue[index] =
      (revenue[index] ?? 0) + (sale.total?.toNumber() ?? 0) - (sale.taxAmount?.toNumber() ?? 0);
  }

  const linesById = new Map(lineMap.map((line) => [line.id, line]));
  const lotsById = new Map(lots.map((lot) => [lot.id, lot]));

  for (const group of costs) {
    const line = linesById.get(group.saleLineId);
    const lot = lotsById.get(group.stockBatchLineId);
    const quantity = group.quantityPulled?.toNumber();

    if (!line || !lot || quantity === undefined) continue;

    const index = bucketIndexOf(line.saleDatetime);

    if (index < 0 || index >= bucketCount) continue;

    cost[index] = (cost[index] ?? 0) + costOf(quantity, group.unitCost.toNumber(), lot);
  }

  return Array.from({ length: bucketCount }, (_, index) => {
    const start = new Date(from.getTime() + index * step);

    return {
      start: start.toISOString(),
      grossProfit: roundMoney((revenue[index] ?? 0) - (cost[index] ?? 0)),
    };
  });
}
