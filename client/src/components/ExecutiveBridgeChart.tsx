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
  value: number;
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
      value: step.budgetChange,
      start,
      end: running,
      kind: step.kind,
    };
  });

  segments.push({
    label: "Net Profit",
    value: total,
    start: 0,
    end: total,
    total: true,
    kind: "profit",
  });

  return segments;
}

function yExtent(segments: Segment[]): [number, number] {
  let min = 0;
  let max = 0;
  for (const seg of segments) {
    min = Math.min(min, seg.start, seg.end);
    max = Math.max(max, seg.start, seg.end);
  }
  // Add 15% padding
  const range = max - min || 1;
  return [min - range * 0.1, max + range * 0.15];
}

function yScale(value: number, min: number, max: number, height: number): number {
  const range = max - min || 1;
  // Invert so higher values are at the top
  return height - ((value - min) / range) * height;
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
  const chartHeight = 200;
  const topPadding = 28;
  const bottomPadding = 40;
  const barPadding = 16;
  const colWidth = chartWidth / segments.length;
  const barWidth = Math.min(colWidth - barPadding * 2, 80);
  const baseline = yScale(0, min, max, chartHeight);

  return (
    <div className="exec-bridge-lane">
      <div className="exec-bridge-lane-title">{title}</div>
      <svg
        className="exec-bridge-svg"
        viewBox={`0 0 ${chartWidth} ${topPadding + chartHeight + bottomPadding}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <g transform={`translate(0, ${topPadding})`}>
          {/* Zero baseline */}
          <line
            x1="0"
            x2={chartWidth}
            y1={baseline}
            y2={baseline}
            stroke="#E8DCC8"
            strokeWidth="1"
            strokeDasharray="4 3"
          />

          {segments.map((segment, index) => {
            const cx = index * colWidth + colWidth / 2;
            const barX = cx - barWidth / 2;
            const yTop = yScale(Math.max(segment.start, segment.end), min, max, chartHeight);
            const yBottom = yScale(Math.min(segment.start, segment.end), min, max, chartHeight);

            // For total bar, always draw from 0
            const rectY = segment.total
              ? yScale(Math.max(0, segment.end), min, max, chartHeight)
              : yTop;
            const rectH = segment.total
              ? Math.abs(yScale(0, min, max, chartHeight) - yScale(segment.end, min, max, chartHeight))
              : Math.max(4, yBottom - yTop);

            // Connector line from previous segment's end to this segment's start
            const showConnector = !segment.total && index > 0;
            const prevCx = (index - 1) * colWidth + colWidth / 2;

            return (
              <g key={`${title}-${segment.label}`}>
                {showConnector && (
                  <line
                    x1={prevCx + barWidth / 2 + 2}
                    x2={barX - 2}
                    y1={yScale(segment.start, min, max, chartHeight)}
                    y2={yScale(segment.start, min, max, chartHeight)}
                    stroke="#B0B0B0"
                    strokeWidth="1"
                    strokeDasharray="3 2"
                  />
                )}
                <rect
                  x={barX}
                  y={rectY}
                  width={barWidth}
                  height={Math.max(4, rectH)}
                  rx="6"
                  fill={KIND_COLORS[segment.kind]}
                  opacity={segment.total ? 0.96 : 0.88}
                />
                {/* Value label above/below bar */}
                <text
                  x={cx}
                  y={rectY - 10}
                  textAnchor="middle"
                  className="exec-bridge-value"
                >
                  {formatM(segment.value, 0)}M
                </text>
                {/* Category label at bottom */}
                <text
                  x={cx}
                  y={chartHeight + 24}
                  textAnchor="middle"
                  className="exec-bridge-label"
                >
                  {segment.label}
                </text>
              </g>
            );
          })}
        </g>
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

  // Shared y-axis scale across both lanes
  const [budgetMin, budgetMax] = yExtent(budgetSegments);
  const [blendedMin, blendedMax] = yExtent(blendedSegments);
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
      <div className="exec-bridge-legend">
        <span className="exec-bridge-legend-item">
          <span style={{ background: KIND_COLORS.inflow, width: 12, height: 12, borderRadius: 3, display: "inline-block" }} /> Inflow
        </span>
        <span className="exec-bridge-legend-item">
          <span style={{ background: KIND_COLORS.outflow, width: 12, height: 12, borderRadius: 3, display: "inline-block" }} /> Outflow
        </span>
        <span className="exec-bridge-legend-item">
          <span style={{ background: KIND_COLORS.profit, width: 12, height: 12, borderRadius: 3, display: "inline-block" }} /> Net Profit
        </span>
      </div>
      <BridgeLane title="Budget Bridge" segments={budgetSegments} min={min} max={max} />
      <BridgeLane title="Current Outlook" segments={blendedSegments} min={min} max={max} />
    </section>
  );
}
