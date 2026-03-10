import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CollectionsRiskDistributionPoint } from "../types";
import { formatNumber } from "../utils/formatters";

const RISK_COLORS: Record<string, string> = {
  Low: "#4CAF50",
  Medium: "#FF9800",
  High: "#F44336",
};

export default function RiskDistributionChart({ data }: { data: CollectionsRiskDistributionPoint[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const filtered = data.filter((d) => d.count > 0);

  return (
    <div className="collections-chart-card">
      <div className="collections-chart-header">
        <h3>Risk Distribution</h3>
        <span>{total} units across risk categories</span>
      </div>
      <div className="collections-chart-body" style={{ height: 280 }}>
        {filtered.length === 0 ? (
          <div className="chart-empty-state">No risk data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={filtered}
                dataKey="amount"
                nameKey="risk"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                label={({ risk, count }) => `${risk} (${count})`}
              >
                {filtered.map((entry) => (
                  <Cell key={entry.risk} fill={RISK_COLORS[entry.risk] ?? "#999"} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`AED ${formatNumber(value)}`, name]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
