import { formatM } from "../utils/formatters";

interface WaterfallChartProps {
  revenue: number;
  cost: number;
  profit: number;
}

export default function WaterfallChart({ revenue, cost, profit }: WaterfallChartProps) {
  const max = Math.max(revenue, cost, Math.abs(profit), 1) * 1.12;
  const profitHeight = (Math.abs(profit) / max) * 100;
  const profitClass = profit >= 0 ? "profit" : "loss";

  return (
    <div className="waterfall">
      <div className="wf-wrap">
        <div className="wf-amt">AED {formatM(revenue)}M</div>
        <div className="wf-bar revenue" style={{ height: `${(revenue / max) * 100}%` }} />
        <div className="wf-lbl">Revenue</div>
      </div>
      <div className="wf-wrap">
        <div className="wf-amt">AED {formatM(cost)}M</div>
        <div className="wf-bar cost" style={{ height: `${(cost / max) * 100}%` }} />
        <div className="wf-lbl">Cost</div>
      </div>
      <div className="wf-wrap">
        <div className="wf-amt">AED {formatM(profit)}M</div>
        <div className={`wf-bar ${profitClass}`} style={{ height: `${profitHeight}%` }} />
        <div className="wf-lbl">{profit >= 0 ? "Profit" : "Loss"}</div>
      </div>
    </div>
  );
}
