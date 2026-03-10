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
import type { CollectionsExposureDistributionPoint } from "../types";
import { formatNumber } from "../utils/formatters";

const BUCKET_COLORS: Record<string, string> = {
  "Not in Aging": "#8BC34A",
  "0-29": "#CDDC39",
  "30-59": "#FFC107",
  "60-89": "#FF9800",
  "90-179": "#FF5722",
  "180-365": "#E53935",
  "365+": "#B71C1C",
};

export default function ExposureBucketChart({ data }: { data: CollectionsExposureDistributionPoint[] }) {
  const filtered = data.filter((d) => d.amount > 0 || d.count > 0);

  return (
    <div className="collections-chart-card">
      <div className="collections-chart-header">
        <h3>Exposure by Aging Bucket</h3>
        <span>Outstanding amount by days overdue</span>
      </div>
      <div className="collections-chart-body" style={{ height: 280 }}>
        {filtered.length === 0 ? (
          <div className="chart-empty-state">No exposure data available</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={filtered} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(value) => formatNumber(value)} />
              <YAxis type="category" dataKey="bucket" width={90} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => [`AED ${formatNumber(value)}`, "Outstanding"]}
                labelFormatter={(label) => `Bucket: ${label}`}
              />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                {filtered.map((entry) => (
                  <Cell key={entry.bucket} fill={BUCKET_COLORS[entry.bucket] ?? "#D26935"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
