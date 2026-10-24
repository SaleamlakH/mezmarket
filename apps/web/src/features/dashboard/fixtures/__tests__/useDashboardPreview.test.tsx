import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDashboardPreview } from '../useDashboardPreview';

describe('useDashboardPreview', () => {
  it('returns no fixture while the dashboard is live', () => {
    const { result } = renderHook(() => useDashboardPreview());

    expect(result.current.mode).toBe('live');
    expect(result.current.fixture).toBeNull();
  });
});
