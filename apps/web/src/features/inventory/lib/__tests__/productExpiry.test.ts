import { describe, it, expect } from 'vitest';
import {
  daysSince,
  EXPIRY_SOON_HORIZON_DAYS,
  expiringSoonLineCount,
  expiryAlertTotals,
  expiryCutoff,
  expiryState,
} from '../productExpiry';
import { flattenProductBatchLines } from '../flattenProductBatchLines';
import { productInventoryDetail } from '../../__tests__/fixtures';

const NOW = new Date('2026-10-17T00:00:00.000Z');
const rows = flattenProductBatchLines(productInventoryDetail.batches);
const CUTOFF = new Date('2026-10-24T00:00:00.000Z');

describe('expiryState', () => {
  it('is expired when the expiry is in the past', () => {
    expect(expiryState({ expiryDate: '2026-10-09T00:00:00.000Z' }, NOW)).toBe('expired');
  });

  it('is expired on the very day of expiry', () => {
    expect(expiryState({ expiryDate: NOW.toISOString() }, NOW)).toBe('expired');
  });

  it('is soon within the horizon', () => {
    expect(expiryState({ expiryDate: '2026-10-24T00:00:00.000Z' }, NOW)).toBe('soon');
  });

  it('is later beyond the horizon', () => {
    const beyond = new Date(NOW);
    beyond.setDate(beyond.getDate() + EXPIRY_SOON_HORIZON_DAYS + 1);
    expect(expiryState({ expiryDate: beyond.toISOString() }, NOW)).toBe('later');
  });

  it('is none without an expiry', () => {
    expect(expiryState({ expiryDate: null }, NOW)).toBe('none');
  });
});

describe('daysSince', () => {
  it('counts whole days the expiry is past', () => {
    expect(daysSince('2026-10-09T00:00:00.000Z', NOW)).toBe(8);
  });
});

describe('expiringSoonLineCount', () => {
  it('counts the lots still holding stock that expire within the horizon', () => {
    expect(
      expiringSoonLineCount(
        rows.map((row) => row.line),
        NOW,
      ),
    ).toBe(1);
  });

  it('leaves out a line with nothing left', () => {
    expect(
      expiringSoonLineCount(
        [{ quantityRemaining: 0, expiryDate: '2026-10-24T00:00:00.000Z' }],
        NOW,
      ),
    ).toBe(0);
  });
});

describe('expiryCutoff', () => {
  it('moves the window forward by the soon horizon', () => {
    expect(expiryCutoff(NOW)).toEqual(CUTOFF);
  });
});

describe('expiryAlertTotals', () => {
  it('adds up the expired and soon quantities still on hand', () => {
    const totals = expiryAlertTotals(
      rows.map((row) => row.line),
      NOW,
    );

    expect(totals.expiredQuantity).toBe(8);
    expect(totals.soonQuantity).toBe(50);
  });

  it('leaves out lines with nothing remaining', () => {
    const totals = expiryAlertTotals(
      [{ quantityRemaining: 0, expiryDate: '2026-10-01T00:00:00.000Z' }],
      NOW,
    );

    expect(totals).toEqual({ expiredQuantity: 0, soonQuantity: 0 });
  });
});
