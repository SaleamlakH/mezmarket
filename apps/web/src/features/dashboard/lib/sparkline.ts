/**
 * Turns a gross-profit series into an SVG path in a fixed view box. No axes,
 * gridlines or labels: the sparkline is a shape, not a chart.
 */
export function buildSparklinePath(
  values: readonly number[],
  width = 100,
  height = 28,
  padding = 2,
): string {
  const middle = height / 2;

  if (values.length === 0) {
    return `M0 ${middle} L${width} ${middle}`;
  }

  if (values.length === 1) {
    return `M0 ${middle} L${width} ${middle}`;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    return `M0 ${middle} L${width} ${middle}`;
  }

  const usableHeight = Math.max(height - padding * 2, 1);
  const step = width / (values.length - 1);
  const points = values.map((value, index) => {
    const x = index * step;
    const y = padding + (1 - (value - min) / (max - min)) * usableHeight;
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  });

  return `M${points[0]} L${points.slice(1).join(' L')}`;
}
