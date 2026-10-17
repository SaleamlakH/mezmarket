import { describe, it, expect } from 'vitest';
import type { StockBatchDetailResponse, StockBatchLineDetailResponse } from '@mez/types';
import { groupLinesByProduct } from '../groupLinesByProduct';
import { batches } from '../../__tests__/fixtures';

const lines = (batches[0] as StockBatchDetailResponse).lines;
const firstLine = lines[0] as StockBatchLineDetailResponse;
const secondLine = lines[1] as StockBatchLineDetailResponse;

describe('groupLinesByProduct', () => {
  it('keeps one group per product, in first-seen order', () => {
    const groups = groupLinesByProduct(lines);

    expect(groups.map((group) => group.productId)).toEqual([
      firstLine.productId,
      secondLine.productId,
    ]);
  });

  it('collects every line of a repeated product into its group', () => {
    const repeated = { ...firstLine, id: 'line_extra' };
    const groups = groupLinesByProduct([firstLine, repeated, secondLine]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.productName).toBe(firstLine.productName);
    expect(groups[0]?.lines.map((line) => line.id)).toEqual([firstLine.id, 'line_extra']);
  });

  it('returns nothing for no lines', () => {
    expect(groupLinesByProduct([])).toEqual([]);
  });
});
