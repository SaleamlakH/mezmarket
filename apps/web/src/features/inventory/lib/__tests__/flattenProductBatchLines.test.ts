import { describe, it, expect } from 'vitest';
import { flattenProductBatchLines } from '../flattenProductBatchLines';
import { productInventoryDetail } from '../../__tests__/fixtures';

describe('flattenProductBatchLines', () => {
  it('turns one row per line, carrying the batch it came from', () => {
    const rows = flattenProductBatchLines(productInventoryDetail.batches);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      batchId: 'batch_rice_0042',
      batchDate: '2026-10-17T00:00:00.000Z',
      referenceNumber: '0042',
    });
    expect(rows[0]?.line.id).toBe('line_rice_0042');
  });

  it('keeps the order the batches and their lines arrived in', () => {
    const rows = flattenProductBatchLines(productInventoryDetail.batches);

    expect(rows.map((row) => row.line.id)).toEqual([
      'line_rice_0042',
      'line_rice_0038',
      'line_rice_0031',
    ]);
  });

  it('is empty for a product with no batches', () => {
    expect(flattenProductBatchLines([])).toEqual([]);
  });
});
