import { describe, it, expect } from 'vitest';
import { groupLinesByUnit } from '../groupLinesByUnit';
import { productInventoryDetail } from '../../__tests__/fixtures';

const batches = productInventoryDetail.batches;

describe('groupLinesByUnit', () => {
  it('groups the stock by the unit it was bought in, first seen first', () => {
    const groups = groupLinesByUnit(batches);

    expect(groups.map((group) => group.purchaseUnit)).toEqual(['Kilogram', 'Sack']);
  });

  it('sums the remaining in both the purchase and base units, and counts the lines', () => {
    const [kilogram, sack] = groupLinesByUnit(batches);

    expect(kilogram).toMatchObject({
      baseUnit: 'Kilogram',
      purchaseUnitRemaining: 20,
      baseQuantityRemaining: 20,
      lineCount: 2,
    });
    expect(sack).toMatchObject({
      baseUnit: 'Kilogram',
      purchaseUnitRemaining: 1,
      baseQuantityRemaining: 50,
      lineCount: 1,
    });
  });

  it('leaves out a unit whose stock is fully gone', () => {
    const firstBatch = batches[0];
    const firstLine = firstBatch?.lines[0];
    if (!firstBatch || !firstLine) throw new Error('no lines to group');

    const groups = groupLinesByUnit([
      {
        ...firstBatch,
        lines: [{ ...firstLine, quantityRemaining: 0, remainingPurchaseQuantity: 0 }],
      },
    ]);

    expect(groups).toEqual([]);
  });
});
