type Props = {
  values: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
};

/**
 * Minimal SVG sparkline. Draws a smooth polyline of `values` mapped to the
 * given box. Designed for stat cards (~60×24px default). Gracefully handles
 * flat or empty series.
 */
export function Sparkline({
  values,
  color = "var(--lavender)",
  width = 64,
  height = 24,
  strokeWidth = 1.75,
  className = "",
}: Props) {
  if (values.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={className}
        aria-hidden="true"
      />
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * (height - strokeWidth) - strokeWidth / 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <path d={areaPath} fill={color} fillOpacity={0.18} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
