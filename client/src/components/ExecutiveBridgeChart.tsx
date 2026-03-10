import { formatM } from "../utils/formatters";

interface BridgeStep {
  label: string;
  budgetChange: number;
  blendedChange: number;
  kind: "inflow" | "outflow";
}

interface ExecutiveBridgeChartProps {
  title: string;
  subtitle: string;
  steps: BridgeStep[];
  budgetTotal: number;
  blendedTotal: number;
}

interface Segment {
  label: string;
  start: number;
  end: number;
  total?: boolean;
  kind: "inflow" | "outflow" | "profit";
}

const KIND_COLORS = {
  inflow: "#1F6B52",
  outflow: "#B65C2E",
  profit: "#2D4F8C",
};

function buildSegments(steps: BridgeStep[], total: number): Segment[] {
  let running = 0;
  const segments: Segment[] = steps.map((step) => {
    const start = running;
    running += step.budgetChange;
    return {
      label: step.label,
      start,
      end: running,
      kind: step.kind,
    };
  });

  segments.push({
    label: "Net Profit",
    start: 0,
    end: total,
    total: true,
    kind: "profit",
  });

  return segments;
}

function extent(segments: Segment[]): [number, number] {
  let min = 0;
  let max = 0;
  for (const segment of segments) {
    min = Math.min(min, segment.start, segment.end);
    max = Math.max(max, segment.start, segment.end);
  }
  return [min, max];
}

function xScale(value: number, min: number, max: number, width: number): number {
  const range = max - min || 1;
  return ((value - min) / range) * width;
}

function BridgeLane({
  title,
  segments,
  min,
  max,
}: {
  title: string;
  segments: Segment[];
  min: number;
  max: number;
}) {
  const chartWidth = 760;
  const groupWidth = chartWidth / segments.length;
  const baseline = xScale(0, min, max, chartWidth);

  return (
    <div className="exec-bridge-lane">
      <div className="exec-bridge-lane-title">{title}</div>
      <svg className="exec-bridge-svg" viewBox={`0 0 ${chartWidth} 140`} preserveAspectRatio="none">
        <line x1={baseline} x2={baseline} y1="8" y2="118" className="exec-bridge-baseline" />
        {segments.map((segment, index) => {
          const left = xScale(Math.min(segment.start, segment.end), min, max, chartWidth);
          const right = xScale(Math.max(segment.start, segment.end), min, max, chartWidth);
          const width = Math.max(6, right - left);
          const centerX = index * groupWidth + groupWidth / 2;
          const barX = Math.max(8, Math.min(chartWidth - width - 8, centerX - width / 2));
          const y = segment.total ? 44 : 26;
          const height = segment.total ? 42 : 28;
          const connectorX1 = xScale(segment.start, min, max, chartWidth);
          const connectorX2 = xScale(segment.end, min, max, chartWidth);

          return (
            <g key={`${title}-${segment.label}`}>
              {!segment.total && (
                <line
                  x1={connectorX1}
                  x2={connectorX2}
                  y1="72"
                  y2="72"
                  className="exec-bridge-connector"
                />
              )}
              <rect
                x={barX}
                y={y}
                width={width}
                height={height}
                rx="10"
                fill={KIND_COLORS[segment.kind]}
                opacity={segment.total ? 0.96 : 0.88}
              />
              <text x={barX + width / 2} y={y - 6} textAnchor="middle" className="exec-bridge-value">
                {formatM(segment.total ? segment.end : segment.end - segment.start, 0)}M
              </text>
              <text x={centerX} y="126" textAnchor="middle" className="exec-bridge-label">
                {segment.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function ExecutiveBridgeChart({
  title,
  subtitle,
  steps,
  budgetTotal,
  blendedTotal,
}: ExecutiveBridgeChartProps) {
  const budgetSegments = buildSegments(
    steps.map((step) => ({ ...step, budgetChange: step.budgetChange })),
    budgetTotal
  );
  const blendedSegments = buildSegments(
    steps.map((step) => ({ ...step, budgetChange: step.blendedChange })),
    blendedTotal
  );
  const [budgetMin, budgetMax] = extent(budgetSegments);
  const [blendedMin, blendedMax] = extent(blendedSegments);
  const min = Math.min(budgetMin, blendedMin);
  const max = Math.max(budgetMax, blendedMax);

  return (
    <section className="exec-bridge-panel">
      <div className="exec-bridge-header">
        <div>
          <h4>{title}</h4>
          <p>{subtitle}</p>
        </div>
        <div className="exec-bridge-summary">
          <div>
            <span className="label">Budget Net Profit</span>
            <strong>AED {formatM(budgetTotal)}M</strong>
          </div>
          <div>
            <span className="label">Current Net Profit</span>
            <strong>AED {formatM(blendedTotal)}M</strong>
          </div>
        </div>
      </div>
      <BridgeLane title="Budget Bridge" segments={budgetSegments} min={min} max={max} />
      <BridgeLane title="Current Outlook" segments={blendedSegments} min={min} max={max} />
    </section>
  );
}
