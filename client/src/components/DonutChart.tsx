import { PARTNER_COLORS } from "../constants";
import { formatM } from "../utils/formatters";
import type { ClientPartner } from "../types";

interface DonutChartProps {
  partners: ClientPartner[];
  totalProfit: number;
}

export default function DonutChart({ partners, totalProfit }: DonutChartProps) {
  const activePartners = partners.filter((partner) => {
    const share = Number(partner.share) || 0;
    return partner.name.trim().length > 0 && share > 0;
  });

  const total = activePartners.reduce((sum, partner) => sum + (Number(partner.share) || 0), 0);
  const r = 46;
  const cx = 60;
  const cy = 60;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="jv-chart-wrap">
      <svg className="donut-svg" width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="46" fill="none" stroke="#EDE1CF" strokeWidth="20" />
        {total > 0 && activePartners.map((partner, index) => {
          const share = Number(partner.share) || 0;
          const pct = share / total;
          const dash = circ * pct;
          const gap = circ * (1 - pct);
          const rotate = -90 + (360 * offset) / total;
          offset += share;
          return (
            <circle
              key={index}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={PARTNER_COLORS[index % PARTNER_COLORS.length]}
              strokeWidth="20"
              strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(${rotate} ${cx} ${cy})`}
              style={{ transition: "all 0.5s" }}
            />
          );
        })}
      </svg>
      <div className="jv-legend">
        {activePartners.length === 0 && (
          <div className="legend-row">
            <div className="legend-name">Add partner names and shares to see the chart.</div>
          </div>
        )}
        {activePartners.map((partner, index) => {
          const share = Number(partner.share) || 0;
          const normalizedPct = total > 0 ? share / total : 0;
          const amount = totalProfit * normalizedPct;
          return (
            <div key={index} className="legend-row">
              <div
                className="legend-dot"
                style={{ background: PARTNER_COLORS[index % PARTNER_COLORS.length] }}
              />
              <div className="legend-name">{partner.name}</div>
              <div>
                <span
                  className="legend-pct"
                  style={{ color: PARTNER_COLORS[index % PARTNER_COLORS.length] }}
                >
                  {formatM(normalizedPct * 100)}%
                </span>
                <span className="legend-amt">AED {formatM(amount)}M</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
