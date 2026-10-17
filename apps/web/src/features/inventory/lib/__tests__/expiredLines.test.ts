import { describe, it, expect } from 'vitest';
import type { StockBatchDetailResponse, StockBatchLineDetailResponse } from '@mez/types';
import { expiredLineCount, isLineExpired } from '../expiredLines';
import { batches } from '../../__tests__/fixtures';

const batch = batches[0] as StockBatchDetailResponse;
const line = batch.lines[0] as StockBatchLineDetailResponse;

describe('isLineExpired', () => {
  it('is true when the expiry falls before the batch was received', () => {
    expect(isLineExpired({ expiryDate: '2026-09-01T00:00:00.000Z' }, batch.batchDate)).toBe(true);
  });

  it('is true when the expiry lands on the day of receipt', () => {
    expect(isLineExpired({ expiryDate: batch.batchDate }, batch.batchDate)).toBe(true);
  });

  it('is false when the expiry falls after the batch was received', () => {
    expect(isLineExpired({ expiryDate: '2027-01-01T00:00:00.000Z' }, batch.batchDate)).toBe(false);
  });

  it('is false when the line carries no expiry', () => {
    expect(isLineExpired({ expiryDate: null }, batch.batchDate)).toBe(false);
  });
});

describe('expiredLineCount', () => {
  it('counts only the lines that had expired by receipt', () => {
    const expired = { ...line, id: 'expired', expiryDate: '2026-01-01T00:00:00.000Z' };
    const future = { ...line, id: 'future', expiryDate: '2030-01-01T00:00:00.000Z' };
    const none = { ...line, id: 'none', expiryDate: null };

    expect(expiredLineCount([expired, future, none], batch.batchDate)).toBe(1);
  });

  it('is zero when nothing had expired', () => {
    expect(expiredLineCount(batch.lines, batch.batchDate)).toBe(0);
  });
});
