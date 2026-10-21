import { describe, it, expect } from 'vitest';
import { validateBatchListFilters } from '../parser.js';

describe('validateBatchListFilters', () => {
  it('defaults the batch status to all', () => {
    const result = validateBatchListFilters({});

    expect(result.errors).toBeNull();
    expect(result.data?.status).toBe('all');
  });

  it('reads an explicit status', () => {
    expect(validateBatchListFilters({ status: 'draft' }).data?.status).toBe('draft');
    expect(validateBatchListFilters({ status: 'confirmed' }).data?.status).toBe('confirmed');
  });

  it('matches the status case-insensitively', () => {
    const result = validateBatchListFilters({ status: 'CONFIRMED' });

    expect(result.errors).toBeNull();
    expect(result.data?.status).toBe('confirmed');
  });

  it('rejects an unknown status', () => {
    expect(validateBatchListFilters({ status: 'voided' }).errors).toEqual({
      status: expect.any(String),
    });
  });
});
