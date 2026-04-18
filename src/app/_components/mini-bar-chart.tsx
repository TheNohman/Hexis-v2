type Props = {
  values: number[];
  highlightIndex?: number;
  color?: string;
  highlightColor?: string;
  width?: number;
  height?: number;
  className?: string;
  /** Labels shown under each bar (e.g. ["L","M","M","J","V","S","D"]). */
  labels?: string[];
};

/**
 * Minimal SVG bar chart — typically 7 bars for a week view with one bar
 * highlighted (today). Optional labels row beneath. Auto-scales to series max.
 */
export function MiniBarChart({
  values,
  highlightIndex,
  color = "var(--lavender)",
  highlightColor = "var(--accent)",
  width = 96,
  height = 40,
  className = "",
  labels,
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

  const labelRowH = labels ? 12 : 0;
  const plotH = height - labelRowH;
  const max = Math.max(...values, 1);
  const gap = 3;
  const barWidth = (width - gap * (values.length - 1)) / values.length;
  const minBarHeight = 4;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      {values.map((v, i) => {
        const h = Math.max(minBarHeight, (v / max) * plotH);
        const x = i * (barWidth + gap);
        const y = plotH - h;
        const isHi = i === highlightIndex;
        return (
          <rect
            key={`bar-${i}`}
            x={x}
            y={y}
            width={barWidth}
            height={h}
            rx={Math.min(barWidth / 2, 4)}
            fill={isHi ? highlightColor : color}
            fillOpacity={v === 0 ? 0.3 : 1}
          />
        );
      })}
      {labels?.map((l, i) => {
        const x = i * (barWidth + gap) + barWidth / 2;
        const isHi = i === highlightIndex;
        return (
          <text
            key={`label-${i}`}
            x={x}
            y={height - 1}
            textAnchor="middle"
            fontSize="9"
            fontWeight={isHi ? 700 : 500}
            fill={isHi ? "var(--foreground)" : "var(--subtle)"}
            fontFamily="var(--font-sans, sans-serif)"
          >
            {l}
          </text>
        );
      })}
    </svg>
  );
}
