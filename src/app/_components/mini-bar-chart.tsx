type Props = {
  values: number[];
  highlightIndex?: number;
  color?: string;
  highlightColor?: string;
  width?: number;
  height?: number;
  className?: string;
};

/**
 * Minimal SVG bar chart — typically 7 bars for a week view with one bar
 * highlighted (today). Auto-scales to the series max.
 */
export function MiniBarChart({
  values,
  highlightIndex,
  color = "var(--lavender)",
  highlightColor = "var(--accent)",
  width = 96,
  height = 40,
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

  const max = Math.max(...values, 1);
  const gap = 3;
  const barWidth = (width - gap * (values.length - 1)) / values.length;
  const minBarHeight = 3;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      {values.map((v, i) => {
        const h = Math.max(minBarHeight, (v / max) * height);
        const x = i * (barWidth + gap);
        const y = height - h;
        const isHi = i === highlightIndex;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={h}
            rx={Math.min(barWidth / 2, 3)}
            fill={isHi ? highlightColor : color}
            fillOpacity={v === 0 ? 0.25 : 1}
          />
        );
      })}
    </svg>
  );
}
