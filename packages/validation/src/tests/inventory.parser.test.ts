import { describe, it, expect } from 'vitest';
import {
  validateProductInventoryDetailQuery,
  validateProductInventoryListQuery,
} from '../parser.js';

describe('validateProductInventoryListQuery', () => {
  it('parses an ISO instant with an offset into a Date', () => {
    const result = validateProductInventoryListQuery({
      expiryBefore: '2026-10-24T00:00:00.000Z',
    });

    expect(result.errors).toBeNull();
    expect(result.data?.expiryBefore).toEqual(new Date('2026-10-24T00:00:00.000Z'));
  });

  it('accepts an explicit numeric offset', () => {
    const result = validateProductInventoryListQuery({
      expiryBefore: '2026-10-24T03:00:00.000+03:00',
    });

    expect(result.errors).toBeNull();
    expect(result.data?.expiryBefore).toEqual(new Date('2026-10-24T00:00:00.000Z'));
  });

  it('reads an absent cutoff as no filter', () => {
    const result = validateProductInventoryListQuery({});

    expect(result.errors).toBeNull();
    expect(result.data?.expiryBefore).toBeUndefined();
  });

  it('reads a blank cutoff as no filter', () => {
    const result = validateProductInventoryListQuery({ expiryBefore: '   ' });

    expect(result.errors).toBeNull();
    expect(result.data?.expiryBefore).toBeUndefined();
  });

  it('rejects a date-only value because it names no instant', () => {
    const result = validateProductInventoryListQuery({ expiryBefore: '2026-10-24' });

    expect(result.errors).toEqual({ expiryBefore: expect.any(String) });
  });

  it('rejects a naive date and time with no zone', () => {
    const result = validateProductInventoryListQuery({
      expiryBefore: '2026-10-24T00:00:00.000',
    });

    expect(result.errors).toEqual({ expiryBefore: expect.any(String) });
  });

  it('rejects nonsense', () => {
    const result = validateProductInventoryListQuery({ expiryBefore: 'soon' });

    expect(result.errors).toEqual({ expiryBefore: expect.any(String) });
  });
});

describe('validateProductInventoryDetailQuery', () => {
  it('parses the expiry cutoff into a Date', () => {
    const result = validateProductInventoryDetailQuery({
      expiryBefore: '2026-10-24T00:00:00.000Z',
    });

    expect(result.errors).toBeNull();
    expect(result.data?.expiryBefore).toEqual(new Date('2026-10-24T00:00:00.000Z'));
  });

  it('reads an absent cutoff as no filter', () => {
    const result = validateProductInventoryDetailQuery({});

    expect(result.errors).toBeNull();
    expect(result.data?.expiryBefore).toBeUndefined();
  });

  it('reads a blank cutoff as no filter', () => {
    const result = validateProductInventoryDetailQuery({ expiryBefore: '   ' });

    expect(result.errors).toBeNull();
    expect(result.data?.expiryBefore).toBeUndefined();
  });

  it('rejects a malformed cutoff', () => {
    const result = validateProductInventoryDetailQuery({ expiryBefore: 'soon' });

    expect(result.errors).toEqual({ expiryBefore: expect.any(String) });
  });
});
