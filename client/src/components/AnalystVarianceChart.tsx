import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatM } from "../utils/formatters";

interface AnalystVarianceDatum {
  label: string;
  team: string;
  budget: number;
  actual: number;
  projected: number;
  kind: "inflow" | "outflow" | "profit";
}

interface AnalystVarianceChartProps {
  title: string;
  subtitle: string;
  data: AnalystVarianceDatum[];
}

const TEAM_COLORS: Record<string, string> = {
  Collections: "#1F6B52",
  Feasibility: "#7B6A55",
  Commercial: "#C76A2A",
  Sales: "#4E8C62",
  Marketing: "#3F6DAA",
  Profit: "#2D4F8C",
};

function DetailTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: AnalystVarianceDatum }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;

  return (
    <div className="exec-variance-tooltip">
      <div className="exec-variance-tooltip-title">{label}</div>
      <div>Team: {item.team}</div>
      <div>Budget: AED {formatM(item.budget)}M</div>
      <div>Actual: AED {formatM(item.actual)}M</div>
      <div>Projected: AED {formatM(item.projected)}M</div>
    </div>
  );
}

export default function AnalystVarianceChart({ title, subtitle, data }: AnalystVarianceChartProps) {
  return (
    <section className="exec-variance-panel analyst-panel">
      <div className="exec-variance-header">
        <div>
          <h4>{title}</h4>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="exec-variance-chart-shell analyst-chart-shell">
        <ResponsiveContainer width="100%" height={Math.max(360, data.length * 44)}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 6, right: 20, bottom: 6, left: 28 }}
            barGap={4}
            barCategoryGap={12}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#D7CCBA" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(value) => `${formatM(value, 0)}M`}
              axisLine={false}
              tickLine={false}
              stroke="#7A6A56"
            />
            <YAxis
              type="category"
              dataKey="label"
              width={150}
              axisLine={false}
              tickLine={false}
              stroke="#3D2914"
            />
            <Tooltip content={<DetailTooltip />} cursor={{ fill: "rgba(61, 41, 20, 0.05)" }} />
            <Bar dataKey="budget" name="Budget" fill="#D8C5A3" radius={[0, 6, 6, 0]} maxBarSize={14} />
            <Bar dataKey="actual" name="Actual" fill="#3D2914" radius={[0, 6, 6, 0]} maxBarSize={14}>
              {data.map((entry) => (
                <Cell key={`${entry.label}-actual`} fill={TEAM_COLORS[entry.team] ?? "#3D2914"} />
              ))}
            </Bar>
            <Bar dataKey="projected" name="Projected" fill="#96A0B3" radius={[0, 6, 6, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
