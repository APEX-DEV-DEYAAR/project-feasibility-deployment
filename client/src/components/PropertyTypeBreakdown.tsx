import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CollectionsPropertyTypeBreakdown } from "../types";
import { formatNumber } from "../utils/formatters";

export default function PropertyTypeBreakdownChart({ data }: { data: CollectionsPropertyTypeBreakdown[] }) {
  const filtered = data.filter((d) => d.forecast > 0 || d.collected > 0);

  return (
    <div className="collections-chart-card">
      <div className="collections-chart-header">
        <h3>Collections by Property Type</h3>
        <span>Forecast vs collected vs outstanding by property category</span>
      </div>
      <div className="collections-chart-body">
        {filtered.length === 0 ? (
          <div className="chart-empty-state">No property type data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={filtered} margin={{ bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="type" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" />
              <YAxis tickFormatter={(value) => formatNumber(value)} />
              <Tooltip formatter={(value: number) => `AED ${formatNumber(value)}`} />
              <Legend />
              <Bar dataKey="forecast" name="Forecast" fill="#F5ECD9" stroke="#D26935" strokeWidth={1} radius={[4, 4, 0, 0]} />
              <Bar dataKey="collected" name="Collected" fill="#4CAF50" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outstanding" name="Outstanding" fill="#D26935" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
