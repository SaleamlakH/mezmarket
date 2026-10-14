import { useMemo } from 'react';
import type { ProductSummaryResponse, ProductUnitOptionResponse } from '@mez/types';
import { getSaleProductUnits, saleProductsFixture } from '../fixtures/saleFlow';
import type { SaleDraftLine } from '../state/saleDraft';
import { useSaleDraft } from '../state/useSaleDraft';

/** A committed draft line joined with the catalog entries it points at. */
export interface SaleDraftViewLine {
  line: SaleDraftLine;
  unit: ProductUnitOptionResponse | undefined;
  unitPrice: number | null;
  lineTotal: number | null;
}

/** One product's committed lines, with the total those lines come to. */
export interface SaleDraftViewGroup {
  productId: string;
  product: ProductSummaryResponse | undefined;
  lines: SaleDraftViewLine[];
  productTotal: number;
}

export interface SaleDraftView {
  groups: SaleDraftViewGroup[];
  /** How many committed lines the sale holds. */
  itemCount: number;
  total: number;
  hasLines: boolean;
}

/**
 * The committed lines of the new-sale draft — those holding a quantity — joined
 * with the product and unit each is sold in and grouped by product, in
 * insertion order. This is the read model the sale panel and the mobile review
 * sheet share.
 *
 * The catalog is read from the runtime fixture for now; this is where the
 * API-backed products and units swap in later.
 */
export function useSaleDraftView(): SaleDraftView {
  const { lines } = useSaleDraft();

  return useMemo(() => {
    const committed = lines.filter((line) => line.quantity > 0);
    const groupsById = new Map<string, SaleDraftViewGroup>();

    for (const line of committed) {
      const unit = getSaleProductUnits(line.productId).find(
        (entry) => entry.id === line.productUnitId,
      );
      const unitPrice = unit?.price ?? null;
      const lineTotal = unitPrice == null ? null : unitPrice * line.quantity;

      let group = groupsById.get(line.productId);
      if (!group) {
        group = {
          productId: line.productId,
          product: saleProductsFixture.find((entry) => entry.id === line.productId),
          lines: [],
          productTotal: 0,
        };
        groupsById.set(line.productId, group);
      }

      group.lines.push({ line, unit, unitPrice, lineTotal });
      group.productTotal += lineTotal ?? 0;
    }

    const groups = [...groupsById.values()];
    const total = groups.reduce((sum, group) => sum + group.productTotal, 0);

    return { groups, itemCount: committed.length, total, hasLines: committed.length > 0 };
  }, [lines]);
}
