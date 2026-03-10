import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatM } from "../utils/formatters";

interface ExecutiveVarianceDatum {
  label: string;
  budget: number;
  actual: number;
  projected: number;
  varianceActual: number;
  varianceProjected: number;
  kind: "inflow" | "outflow" | "profit";
}

interface ExecutiveVarianceChartProps {
  title: string;
  subtitle: string;
  data: ExecutiveVarianceDatum[];
}

const KIND_COLORS: Record<ExecutiveVarianceDatum["kind"], string> = {
  inflow: "#1F6B52",
  outflow: "#A44A1B",
  profit: "#2D4F8C",
};

function VarianceTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: ExecutiveVarianceDatum }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;

  return (
    <div className="exec-variance-tooltip">
      <div className="exec-variance-tooltip-title">{label}</div>
      <div>Budget: AED {formatM(item.budget)}M</div>
      <div>Actual: AED {formatM(item.actual)}M</div>
      <div>Projected: AED {formatM(item.projected)}M</div>
      <div>Actual vs Budget: AED {formatM(item.varianceActual)}M</div>
      <div>Projected vs Budget: AED {formatM(item.varianceProjected)}M</div>
    </div>
  );
}

export default function ExecutiveVarianceChart({ title, subtitle, data }: ExecutiveVarianceChartProps) {
  const totalBudget = data.reduce((sum, item) => sum + item.budget, 0);
  const totalActual = data.reduce((sum, item) => sum + item.actual, 0);
  const totalProjected = data.reduce((sum, item) => sum + item.projected, 0);

  return (
    <section className="exec-variance-panel">
      <div className="exec-variance-header">
        <div>
          <h4>{title}</h4>
          <p>{subtitle}</p>
        </div>
        <div className="exec-variance-kpis">
          <div className="exec-variance-kpi">
            <span className="label">Budget Lens</span>
            <strong>AED {formatM(totalBudget)}M</strong>
          </div>
          <div className="exec-variance-kpi">
            <span className="label">Actual Captured</span>
            <strong>AED {formatM(totalActual)}M</strong>
          </div>
          <div className="exec-variance-kpi">
            <span className="label">Projected View</span>
            <strong>AED {formatM(totalProjected)}M</strong>
          </div>
        </div>
      </div>

      <div className="exec-variance-chart-shell">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 12, right: 28, bottom: 12, left: 24 }}
            barCategoryGap={14}
            barGap={4}
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
              width={148}
              axisLine={false}
              tickLine={false}
              stroke="#3D2914"
            />
            <Tooltip content={<VarianceTooltip />} cursor={{ fill: "rgba(61, 41, 20, 0.05)" }} />
            <Bar dataKey="budget" name="Budget" fill="#D8C5A3" radius={[0, 6, 6, 0]} maxBarSize={18}>
              <LabelList dataKey="budget" position="right" formatter={(value: number) => formatM(value, 0)} fill="#6F5840" fontSize={11} />
            </Bar>
            <Bar dataKey="actual" name="Actual" fill="#3D2914" radius={[0, 6, 6, 0]} maxBarSize={18}>
              {data.map((entry) => (
                <Cell key={`${entry.label}-actual`} fill={KIND_COLORS[entry.kind]} />
              ))}
            </Bar>
            <Bar dataKey="projected" name="Projected" fill="#7F8EA3" radius={[0, 6, 6, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="exec-variance-footnote">
        Budget, actual, and projected are shown together because executive variance views work best when the baseline and both outcome states are visible in one frame.
      </div>
    </section>
  );
}
