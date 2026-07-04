import { useMemo } from 'react';

export interface ChartPoint {
  x: number;
  y: number;
}
export interface ChartSeries {
  color: string;
  points: ChartPoint[];
  dashed?: boolean;
}

const VIEW_W = 1000;
const PAD_T = 10;
const PAD_B = 16;
const PAD_L = 6;
const PAD_R = 6;
const LOG_FLOOR = 1e-16;

/**
 * Compact, dependency-free SVG line chart. Uses a fixed viewBox with
 * non-scaling strokes so it stretches to any width while staying crisp. Handles
 * one series (metric cards, with an area fill) or several (integrator compare),
 * on a linear or log-10 y-axis.
 */
export function LineChart({
  series,
  height = 118,
  logY = false,
  fill = false,
  yFormat = (v: number) => v.toExponential(1),
}: {
  series: ChartSeries[];
  height?: number;
  logY?: boolean;
  fill?: boolean;
  yFormat?: (v: number) => string;
}) {
  const model = useMemo(() => {
    const all = series.flatMap((s) => s.points);
    if (all.length < 2) return null;

    const ty = (y: number) => (logY ? Math.log10(Math.max(y, LOG_FLOOR)) : y);

    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    for (const p of all) {
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
      const v = ty(p.y);
      if (v < yMin) yMin = v;
      if (v > yMax) yMax = v;
    }
    if (xMax <= xMin) xMax = xMin + 1;
    if (yMax - yMin < 1e-12) {
      // Flat data — give it a little vertical room so the line is visible.
      const pad = Math.max(Math.abs(yMax) * 0.05, 1e-9);
      yMin -= pad;
      yMax += pad;
    }

    const sx = (x: number) =>
      PAD_L + ((x - xMin) / (xMax - xMin)) * (VIEW_W - PAD_L - PAD_R);
    const sy = (y: number) =>
      height - PAD_B - ((ty(y) - yMin) / (yMax - yMin)) * (height - PAD_T - PAD_B);

    const paths = series.map((s) => {
      const d = s.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`)
        .join(' ');
      const last = s.points[s.points.length - 1];
      return { d, color: s.color, dashed: s.dashed, lastX: sx(last.x), lastY: sy(last.y) };
    });

    const areaD =
      fill && paths[0]
        ? `${paths[0].d} L${sx(xMax).toFixed(1)} ${(height - PAD_B).toFixed(1)} L${sx(xMin).toFixed(
            1,
          )} ${(height - PAD_B).toFixed(1)} Z`
        : null;

    const gridY = [yMin, (yMin + yMax) / 2, yMax].map((v) => ({
      y: sy(logY ? 10 ** v : v),
      label: yFormat(logY ? 10 ** v : v),
    }));

    return { paths, areaD, gridY, xMin, xMax };
  }, [series, height, logY, fill, yFormat]);

  const gradientId = useMemo(() => `chart-fill-${Math.random().toString(36).slice(2, 8)}`, []);

  if (!model) {
    return <div className="chart__empty">Collecting data…</div>;
  }

  return (
    <svg
      className="chart"
      height={height}
      viewBox={`0 0 ${VIEW_W} ${height}`}
      preserveAspectRatio="none"
      role="img"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={series[0]?.color ?? '#3fe0c5'} stopOpacity="0.28" />
          <stop offset="100%" stopColor={series[0]?.color ?? '#3fe0c5'} stopOpacity="0" />
        </linearGradient>
      </defs>

      {model.gridY.map((g, i) => (
        <g key={i}>
          <line
            x1={PAD_L}
            x2={VIEW_W - PAD_R}
            y1={g.y}
            y2={g.y}
            stroke="#1b2436"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
          <text
            x={PAD_L + 2}
            y={g.y - 2}
            fill="#5c6884"
            fontSize="9"
            fontFamily="var(--font-mono)"
          >
            {g.label}
          </text>
        </g>
      ))}

      {model.areaD && <path d={model.areaD} fill={`url(#${gradientId})`} stroke="none" />}

      {model.paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill="none"
          stroke={p.color}
          strokeWidth={1.6}
          strokeDasharray={p.dashed ? '4 4' : undefined}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {series.length === 1 && model.paths[0] && (
        <circle cx={model.paths[0].lastX} cy={model.paths[0].lastY} r={2.6} fill={series[0].color} />
      )}
    </svg>
  );
}
