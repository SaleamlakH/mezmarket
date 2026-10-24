import { roundMoney } from '../../../shared/utils/rounding.js';
import { quantityInBase, unitCostPerBase } from '../../../shared/utils/snapshot.js';
import type { CostGroup, CostingLot, LossGroup, SalesFigures } from '../dashboard.types.js';

export type LossFigures = {
  total: number;
  count: number;
};

/** The cost of a base-unit quantity at a lot's purchase-unit cost. */
export function costOf(quantity: number, unitCost: number, lot: CostingLot): number {
  const baseQuantity = quantityInBase(lot.units, lot.purchaseQuantity);

  return quantity * unitCostPerBase(unitCost, baseQuantity, lot.purchaseQuantity.toNumber());
}

/** COGS for grouped sale costs, priced at each line's frozen unit cost. */
export function cogsOf(groups: CostGroup[], lots: CostingLot[]): number {
  const lotsById = new Map(lots.map((lot) => [lot.id, lot]));

  return groups.reduce((total, group) => {
    const quantity = group.quantityPulled?.toNumber();
    const lot = lotsById.get(group.stockBatchLineId);

    if (quantity === undefined || !lot) return total;

    return total + costOf(quantity, group.unitCost.toNumber(), lot);
  }, 0);
}

/** Values every grouped loss row at its lot's cost and sums both money and rows. */
export function lossesOf(groups: LossGroup[], lots: CostingLot[]): LossFigures {
  const lotsById = new Map(lots.map((lot) => [lot.id, lot]));
  let total = 0;
  let count = 0;

  for (const group of groups) {
    count += group.count;

    const quantity = group.standardQuantity?.toNumber();
    const lot = lotsById.get(group.stockBatchLineId);

    if (quantity === undefined || !lot) continue;

    total += costOf(quantity, lot.purchaseUnitCost.toNumber(), lot);
  }

  return { total, count };
}

/** Gross profit is revenue excluding tax, less cost of goods sold. */
export function grossProfitOf(sales: SalesFigures, cogs: number): number {
  return sales.total - sales.taxAmount - cogs;
}

/** Percentage change from `previous` to `current`, empty when there is no base. */
export function deltaPercentOf(current: number, previous: number): number | null {
  if (previous <= 0) return null;

  return roundMoney(((current - previous) / previous) * 100);
}
