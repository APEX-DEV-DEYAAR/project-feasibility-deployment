import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CollectionsWeeklyTrendPoint } from "../types";
import { formatNumber } from "../utils/formatters";

export default function WeeklyTrendChart({ data }: { data: CollectionsWeeklyTrendPoint[] }) {
  const hasData = data.some((d) => d.collectedAmount > 0 || d.forecastDue > 0);

  return (
    <div className="collections-chart-card">
      <div className="collections-chart-header">
        <h3>Weekly Collections Trend</h3>
        <span>12-week rolling collections vs forecast due</span>
      </div>
      <div className="collections-chart-body">
        {!hasData ? (
          <div className="chart-empty-state">No weekly trend data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="amount" tickFormatter={(value) => formatNumber(value)} />
              <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(value: number, name: string) =>
                  name === "Efficiency %" ? `${value.toFixed(1)}%` : `AED ${formatNumber(value)}`
                }
              />
              <Legend />
              <Area
                yAxisId="amount"
                dataKey="forecastDue"
                name="Forecast Due"
                fill="#F5ECD9"
                stroke="#D26935"
                fillOpacity={0.3}
              />
              <Area
                yAxisId="amount"
                dataKey="collectedAmount"
                name="Collected"
                fill="#C8E6C9"
                stroke="#4CAF50"
                fillOpacity={0.4}
              />
              <Line
                yAxisId="pct"
                dataKey="efficiencyPct"
                name="Efficiency %"
                stroke="#1565C0"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
