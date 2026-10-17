import { describe, it, expect } from 'vitest';
import { groupLinesByUnit } from '../groupLinesByUnit';
import { flattenProductBatchLines } from '../flattenProductBatchLines';
import { productInventoryDetail } from '../../__tests__/fixtures';

const rows = flattenProductBatchLines(productInventoryDetail.batches);

describe('groupLinesByUnit', () => {
  it('groups the stock by the unit it was bought in, first seen first', () => {
    const groups = groupLinesByUnit(rows);

    expect(groups.map((group) => group.purchaseUnit)).toEqual(['Kilogram', 'Sack']);
  });

  it('sums the remaining quantity and counts the lines behind it', () => {
    const [kilogram, sack] = groupLinesByUnit(rows);

    expect(kilogram).toMatchObject({
      standardUnit: 'kg',
      baseEquivalent: 1,
      quantityRemaining: 20,
      lineCount: 2,
    });
    expect(sack).toMatchObject({
      standardUnit: 'kg',
      baseEquivalent: 50,
      quantityRemaining: 50,
      lineCount: 1,
    });
  });

  it('leaves out a unit whose stock is fully gone', () => {
    const first = rows[0];
    if (!first) throw new Error('no rows to group');

    const groups = groupLinesByUnit([{ ...first, line: { ...first.line, quantityRemaining: 0 } }]);

    expect(groups).toEqual([]);
  });
});
