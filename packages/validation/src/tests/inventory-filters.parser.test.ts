import { describe, it, expect } from 'vitest';
import { validateProductInventoryListQuery } from '../parser.js';

describe('validateProductInventoryListQuery filters', () => {
  it('defaults the product status to active', () => {
    const result = validateProductInventoryListQuery({});

    expect(result.errors).toBeNull();
    expect(result.data?.status).toBe('active');
  });

  it('reads an explicit status case-insensitively', () => {
    expect(validateProductInventoryListQuery({ status: 'ALL' }).data?.status).toBe('all');
    expect(validateProductInventoryListQuery({ status: 'Inactive' }).data?.status).toBe('inactive');
  });

  it('rejects an unknown status', () => {
    expect(validateProductInventoryListQuery({ status: 'archived' }).errors).toEqual({
      status: expect.any(String),
    });
  });

  it('normalizes a comma-separated stock status to canonical values', () => {
    const result = validateProductInventoryListQuery({ stockStatus: 'low_stock,out_of_stock' });

    expect(result.errors).toBeNull();
    expect(result.data?.stockStatus).toEqual(['LOW_STOCK', 'OUT_OF_STOCK']);
  });

  it('matches stock status case-insensitively and ignores surrounding whitespace', () => {
    const result = validateProductInventoryListQuery({ stockStatus: ' In_Stock , low_Stock ' });

    expect(result.errors).toBeNull();
    expect(result.data?.stockStatus).toEqual(['IN_STOCK', 'LOW_STOCK']);
  });

  it('rejects an unknown stock status', () => {
    expect(validateProductInventoryListQuery({ stockStatus: 'plenty' }).errors).toEqual({
      stockStatus: expect.any(String),
    });
  });

  it('reads a blank stock status as no filter', () => {
    const result = validateProductInventoryListQuery({ stockStatus: '   ' });

    expect(result.errors).toBeNull();
    expect(result.data?.stockStatus).toBeUndefined();
  });

  it('normalizes a comma-separated expiry status', () => {
    const result = validateProductInventoryListQuery({ expiryStatus: 'expired,soon' });

    expect(result.errors).toBeNull();
    expect(result.data?.expiryStatus).toEqual(['expired', 'soon']);
  });

  it('rejects an unknown expiry status', () => {
    expect(validateProductInventoryListQuery({ expiryStatus: 'later' }).errors).toEqual({
      expiryStatus: expect.any(String),
    });
  });

  it('allows expiryStatus combined with expiryBefore as the soon bound', () => {
    const result = validateProductInventoryListQuery({
      expiryStatus: 'expired',
      expiryBefore: '2026-10-24T00:00:00.000Z',
    });

    expect(result.errors).toBeNull();
    expect(result.data?.expiryStatus).toEqual(['expired']);
    expect(result.data?.expiryBefore).toEqual(new Date('2026-10-24T00:00:00.000Z'));
  });

  it('allows stockStatus combined with expiryStatus', () => {
    const result = validateProductInventoryListQuery({
      stockStatus: 'low_stock',
      expiryStatus: 'soon',
    });

    expect(result.errors).toBeNull();
    expect(result.data?.stockStatus).toEqual(['LOW_STOCK']);
    expect(result.data?.expiryStatus).toEqual(['soon']);
  });

  it('still reads the expiry cutoff on its own', () => {
    const result = validateProductInventoryListQuery({ expiryBefore: '2026-10-24T00:00:00.000Z' });

    expect(result.errors).toBeNull();
    expect(result.data?.expiryBefore).toEqual(new Date('2026-10-24T00:00:00.000Z'));
  });
});
