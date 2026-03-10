import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CollectionsCashflowPoint } from "../types";
import { formatNumber } from "../utils/formatters";

export default function CfoCashflowChart({ data }: { data: CollectionsCashflowPoint[] }) {
  return (
    <div className="collections-chart-card">
      <div className="collections-chart-header">
        <h3>CFO Cashflow Lens</h3>
        <span>Scheduled, weighted forecast, and actual collections</span>
      </div>
      <div className="collections-chart-body">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => formatNumber(value)} />
            <Tooltip formatter={(value: number) => `AED ${formatNumber(value)}`} />
            <Legend />
            <Bar dataKey="scheduled" name="Scheduled" fill="#D26935" radius={[6, 6, 0, 0]} />
            <Area dataKey="weightedForecast" name="Weighted Forecast" fill="#F5C27A" stroke="#B26B00" fillOpacity={0.35} />
            <Line dataKey="actualCollections" name="Actual Collections" stroke="#1B5E20" strokeWidth={3} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
