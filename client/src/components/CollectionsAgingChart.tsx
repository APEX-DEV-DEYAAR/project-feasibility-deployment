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
import type { CollectionsAgingBucket } from "../types";
import { formatNumber } from "../utils/formatters";

const COLORS = ["#8BC34A", "#FFC107", "#FB8C00", "#F4511E", "#B71C1C"];

export default function CollectionsAgingChart({ data }: { data: CollectionsAgingBucket[] }) {
  return (
    <div className="collections-chart-card">
      <div className="collections-chart-header">
        <h3>Aging Overview</h3>
        <span>Outstanding collections by due bucket</span>
      </div>
      <div className="collections-chart-body">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="bucket" />
            <YAxis tickFormatter={(value) => formatNumber(value)} />
            <Tooltip formatter={(value: number) => `AED ${formatNumber(value)}`} />
            <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={entry.bucket} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
