import { describe, expect, it } from 'vitest';
import { buildSparklinePath } from '../sparkline';

describe('buildSparklinePath', () => {
  it('draws a flat midline when there are no values', () => {
    expect(buildSparklinePath([])).toBe('M0 14 L100 14');
  });

  it('draws a flat midline for a single value', () => {
    expect(buildSparklinePath([42])).toBe('M0 14 L100 14');
  });

  it('draws a flat midline when every value is the same', () => {
    expect(buildSparklinePath([42, 42, 42])).toBe('M0 14 L100 14');
  });

  it('maps the lowest and highest values inside the padded height', () => {
    expect(buildSparklinePath([10, 20])).toBe('M0.00 26.00 L100.00 2.00');
  });

  it('spaces points evenly across the width', () => {
    expect(buildSparklinePath([0, 1, 2])).toBe('M0.00 26.00 L50.00 14.00 L100.00 2.00');
  });

  it('uses the requested width and height', () => {
    expect(buildSparklinePath([10, 20], 40, 20, 2)).toBe('M0.00 18.00 L40.00 2.00');
  });
});
