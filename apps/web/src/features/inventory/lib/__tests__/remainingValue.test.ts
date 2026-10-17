import { describe, it, expect } from 'vitest';
import { remainingValueOf } from '../remainingValue';
import { flattenProductBatchLines } from '../flattenProductBatchLines';
import { productInventoryDetail } from '../../__tests__/fixtures';

const rows = flattenProductBatchLines(productInventoryDetail.batches);
const byId = (id: string) => {
  const row = rows.find((candidate) => candidate.line.id === id);
  if (!row) throw new Error(`missing row ${id}`);
  return row.line;
};

describe('remainingValueOf', () => {
  it('scales the line cost by the fraction still unsold', () => {
    expect(remainingValueOf(byId('line_rice_0031'))).toBeCloseTo(15.2);
    expect(remainingValueOf(byId('line_rice_0038'))).toBeCloseTo(95);
    expect(remainingValueOf(byId('line_rice_0042'))).toBeCloseTo(24);
  });

  it('adds up to the product total', () => {
    const total = rows.reduce((sum, row) => sum + remainingValueOf(row.line), 0);
    expect(total).toBeCloseTo(productInventoryDetail.totalCost);
  });

  it('contributes nothing when the standard quantity is zero', () => {
    expect(remainingValueOf({ ...byId('line_rice_0031'), standardQuantity: 0 })).toBe(0);
  });
});
