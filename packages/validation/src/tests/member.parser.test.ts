import { describe, it, expect } from 'vitest';
import { validateMemberListQuery } from '../parser.js';

describe('validateMemberListQuery', () => {
  it('keeps the role a caller names', () => {
    const result = validateMemberListQuery({ role: 'SERVER' });

    expect(result.errors).toBeNull();
    expect(result.data?.role).toBe('SERVER');
  });

  it('normalizes a lowercase role to uppercase', () => {
    const result = validateMemberListQuery({ role: 'server' });

    expect(result.errors).toBeNull();
    expect(result.data?.role).toBe('SERVER');
  });

  it('reads an absent role as no filter', () => {
    const result = validateMemberListQuery({});

    expect(result.errors).toBeNull();
    expect(result.data?.role).toBeUndefined();
  });

  it('reads a blank role as no filter', () => {
    const result = validateMemberListQuery({ role: '   ' });

    expect(result.errors).toBeNull();
    expect(result.data?.role).toBeUndefined();
  });

  it('rejects a role that is not a member role', () => {
    const result = validateMemberListQuery({ role: 'BARTENDER' });

    expect(result.errors).toEqual({ role: expect.any(String) });
  });
});
