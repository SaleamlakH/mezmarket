import { describe, expect, it } from 'vitest';
import { backNavigation, forwardNavigationState } from '../useNavigationHistory';

describe('navigation history', () => {
  it('appends the current address to the trail', () => {
    expect(forwardNavigationState(null, '/inventory')).toEqual({
      from: ['/inventory'],
    });
    expect(forwardNavigationState({ from: ['/inventory'] }, '/inventory/products/rice')).toEqual({
      from: ['/inventory', '/inventory/products/rice'],
    });
  });

  it('returns to the previous address and keeps the rest of the trail', () => {
    expect(
      backNavigation({ from: ['/inventory', '/inventory/products/rice'] }, '/inventory/batches'),
    ).toEqual({
      to: '/inventory/products/rice',
      state: { from: ['/inventory'] },
    });
  });

  it('falls back when there is no earlier address', () => {
    expect(backNavigation(null, '/inventory/batches')).toEqual({
      to: '/inventory/batches',
      state: { from: [] },
    });
  });

  it('ignores a legacy single-address trail', () => {
    expect(backNavigation({ from: '/inventory' }, '/inventory/batches')).toEqual({
      to: '/inventory/batches',
      state: { from: [] },
    });
  });
});
